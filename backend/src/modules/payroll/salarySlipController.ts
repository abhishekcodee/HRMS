import { Response } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { sendSalarySlipEmail, isValidEmail } from '../../services/emailService.js';
import { logger } from '../../utils/logger.js';

// Configure multer storage for in-memory file parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('excelFile');

export const uploadMiddleware = upload;

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
}).single('slipFile');

export const uploadSingleMiddleware = uploadSingle;

export interface ExcelSalaryRecord {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  salaryMonth: string;
  salaryYear: string;
  salarySlipFile?: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * 1. Validate Excel Salary Slip File (Upload -> Parse -> Validate -> Return Preview)
 */
export async function validateSalarySlipExcel(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please select an Excel file (.xlsx, .xls, .csv) to upload.' },
      });
      return;
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_FILE', message: 'Uploaded Excel file contains no data rows.' },
      });
      return;
    }

    // Fetch all active employees from database for cross-validation
    const [dbUsers]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email
       FROM users u`
    );

    const userMapByEmpId = new Map<string, any>();
    const userMapByEmail = new Map<string, any>();
    for (const u of dbUsers) {
      if (u.employeeId) userMapByEmpId.set(u.employeeId.toUpperCase(), u);
      if (u.email) userMapByEmail.set(u.email.toLowerCase(), u);
    }

    const previewList: ExcelSalaryRecord[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let missingEmailCount = 0;
    let missingSlipFileCount = 0;

    for (const row of rawRows) {
      // Flexibly extract keys
      const empIdRaw = String(row['Employee ID'] || row['employee_id'] || row['Emp ID'] || '').trim();
      const empNameRaw = String(row['Employee Name'] || row['employee_name'] || row['Name'] || '').trim();
      const empEmailRaw = String(row['Employee Email'] || row['employee_email'] || row['Email'] || '').trim();
      const monthRaw = String(row['Salary Month'] || row['salary_month'] || row['Month'] || '').trim();
      const yearRaw = String(row['Salary Year'] || row['salary_year'] || row['Year'] || '').trim();
      const slipFileRaw = String(row['Salary Slip File'] || row['salary_slip_file'] || row['File'] || '').trim();

      let isValid = true;
      const errors: string[] = [];

      if (!empIdRaw) {
        isValid = false;
        errors.push('Missing Employee ID');
      }

      // Check DB existence
      const dbMatch = empIdRaw ? userMapByEmpId.get(empIdRaw.toUpperCase()) : null;
      if (empIdRaw && !dbMatch) {
        isValid = false;
        errors.push(`Employee ID "${empIdRaw}" not found in HRMS database`);
      }

      // Validate email
      const targetEmail = empEmailRaw || (dbMatch ? dbMatch.email : '');
      if (!targetEmail || !isValidEmail(targetEmail)) {
        isValid = false;
        missingEmailCount++;
        errors.push('Missing or invalid email address');
      }

      if (!monthRaw) {
        isValid = false;
        errors.push('Missing Salary Month');
      }

      if (!yearRaw) {
        isValid = false;
        errors.push('Missing Salary Year');
      }

      if (!slipFileRaw) {
        missingSlipFileCount++;
        // Optional file path fallback notice
      }

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      previewList.push({
        employeeId: empIdRaw || 'UNKNOWN',
        employeeName: empNameRaw || (dbMatch ? dbMatch.fullName : 'N/A'),
        employeeEmail: targetEmail || 'N/A',
        salaryMonth: monthRaw || 'N/A',
        salaryYear: yearRaw || 'N/A',
        salarySlipFile: slipFileRaw || 'Standard Template Slip',
        isValid,
        validationError: errors.length > 0 ? errors.join('; ') : undefined,
      });
    }

    res.json({
      success: true,
      message: 'Excel file parsed and validated successfully.',
      summary: {
        totalRecords: rawRows.length,
        validCount,
        invalidCount,
        missingEmailCount,
        missingSlipFileCount,
      },
      preview: previewList,
    });
  } catch (error: any) {
    logger.error('Validate Salary Slip Excel Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EXCEL_PARSING_ERROR', message: `Failed to parse Excel file: ${error.message}` },
    });
  }
}

/**
 * 2. Send Single Salary Slip Manually (Individual Employee)
 */
export async function sendSingleSalarySlip(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      employeeName,
      employeeEmail,
      salaryMonth,
      salaryYear,
      basicSalary,
      hra,
      totalEarnings,
      totalDeductions,
      netPayableSalary,
      salarySlipFile,
    } = req.body;

    if (!employeeId || !salaryMonth || !salaryYear) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Employee ID, salary month, and salary year are required.' },
      });
      return;
    }

    let targetEmail = (employeeEmail || '').trim();
    let targetName = (employeeName || '').trim();

    // If name or email missing, attempt DB lookup
    if (!targetEmail || !targetName) {
      const [dbMatch]: any = await pool.query(
        `SELECT id, employee_id as employeeId, full_name as fullName, email FROM users
         WHERE employee_id = ? OR id = ? LIMIT 1`,
        [employeeId, employeeId]
      );
      if (dbMatch && dbMatch.length > 0) {
        if (!targetName) targetName = dbMatch[0].fullName || employeeId;
        if (!targetEmail) targetEmail = dbMatch[0].email || '';
      }
    }

    if (!targetEmail || !isValidEmail(targetEmail)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: `A valid email address is required for dispatch. Provided: "${targetEmail || 'empty'}"` },
      });
      return;
    }

    let attachmentBuffer: Buffer | undefined = undefined;
    let attachmentFilename: string | undefined = undefined;

    if (req.file) {
      attachmentBuffer = req.file.buffer;
      attachmentFilename = req.file.originalname;
    }

    const sendRes = await sendSalarySlipEmail({
      employeeId: String(employeeId).trim(),
      employeeName: targetName || String(employeeId),
      employeeEmail: targetEmail,
      salaryMonth: String(salaryMonth).trim(),
      salaryYear: String(salaryYear).trim(),
      salarySlipFilePath: salarySlipFile ? String(salarySlipFile).trim() : undefined,
      attachmentBuffer,
      attachmentFilename,
      basicSalary: basicSalary ? Number(basicSalary) : undefined,
      hra: hra ? Number(hra) : undefined,
      totalEarnings: totalEarnings ? Number(totalEarnings) : undefined,
      totalDeductions: totalDeductions ? Number(totalDeductions) : undefined,
      netPayableSalary: netPayableSalary ? Number(netPayableSalary) : undefined,
    });

    if (sendRes.success) {
      res.json({
        success: true,
        message: `Salary slip for ${targetName} (${salaryMonth} ${salaryYear}) has been dispatched successfully to ${targetEmail}.`,
        data: { logId: sendRes.logId },
      });
    } else {
      res.status(400).json({
        success: false,
        error: { code: 'SEND_FAILED', message: sendRes.error || 'Failed to dispatch salary slip email.' },
      });
    }
  } catch (error: any) {
    logger.error('Send Single Salary Slip Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to send single salary slip email.' },
    });
  }
}

/**
 * 3. Send Bulk Salary Slips (After HR Confirmation)
 */
export async function sendBulkSalarySlips(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { items } = req.body; // Array of validated ExcelSalaryRecord

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No valid salary slip records provided for sending.' },
      });
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const results: any[] = [];

    for (const record of items) {
      if (!record.isValid) {
        skippedCount++;
        results.push({
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          email: record.employeeEmail,
          salaryMonth: `${record.salaryMonth} ${record.salaryYear}`,
          status: 'SKIPPED',
          errorMessage: record.validationError || 'Invalid record',
          sentTime: null,
        });
        continue;
      }

      // Call email service with duplicate protection
      const sendRes = await sendSalarySlipEmail({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        employeeEmail: record.employeeEmail,
        salaryMonth: record.salaryMonth,
        salaryYear: record.salaryYear,
        salarySlipFilePath: record.salarySlipFile,
      });

      if (sendRes.success) {
        sentCount++;
        results.push({
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          email: record.employeeEmail,
          salaryMonth: `${record.salaryMonth} ${record.salaryYear}`,
          status: 'SENT',
          errorMessage: null,
          sentTime: new Date().toISOString(),
        });
      } else if (sendRes.error && sendRes.error.includes('already sent')) {
        skippedCount++;
        results.push({
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          email: record.employeeEmail,
          salaryMonth: `${record.salaryMonth} ${record.salaryYear}`,
          status: 'SKIPPED',
          errorMessage: 'Duplicate: Salary slip already sent for this pay period.',
          sentTime: null,
        });
      } else {
        failedCount++;
        results.push({
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          email: record.employeeEmail,
          salaryMonth: `${record.salaryMonth} ${record.salaryYear}`,
          status: 'FAILED',
          errorMessage: sendRes.error || 'SMTP Delivery Failed',
          sentTime: null,
        });
      }
    }

    res.json({
      success: true,
      message: `Salary slip bulk email processing completed. ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped.`,
      summary: {
        total: items.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      },
      details: results,
    });
  } catch (error: any) {
    logger.error('Send Bulk Salary Slips Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process bulk salary slip emails.' },
    });
  }
}

/**
 * 3. Retry Failed Salary Slip Emails
 */
export async function retryFailedSalarySlips(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [failedRows]: any = await pool.query(
      `SELECT id, employee_id as employeeId, employee_email as employeeEmail, salary_month as salaryMonth,
              salary_year as salaryYear, salary_slip_file as salarySlipFile
       FROM salary_slip_email_logs
       WHERE status = 'FAILED'`
    );

    if (failedRows.length === 0) {
      res.json({
        success: true,
        message: 'No failed salary slip emails to retry.',
        summary: { total: 0, sent: 0, failed: 0 },
      });
      return;
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const row of failedRows) {
      // Lookup employee full name
      const [empRows]: any = await pool.query('SELECT full_name FROM users WHERE employee_id = ?', [row.employeeId]);
      const fullName = empRows.length > 0 ? empRows[0].full_name : row.employeeId;

      const resSend = await sendSalarySlipEmail({
        employeeId: row.employeeId,
        employeeName: fullName,
        employeeEmail: row.employeeEmail,
        salaryMonth: row.salaryMonth,
        salaryYear: row.salaryYear,
        salarySlipFilePath: row.salarySlipFile,
      });

      if (resSend.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `Retry completed. Re-sent ${sentCount} failed salary slips, ${failedCount} failed again.`,
      summary: {
        total: failedRows.length,
        sent: sentCount,
        failed: failedCount,
      },
    });
  } catch (error: any) {
    logger.error('Retry Failed Salary Slips Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retry failed salary slips.' } });
  }
}

/**
 * 4. Get Salary Slip Email Delivery Logs
 */
export async function getSalarySlipLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT log.id, log.employee_id as employeeId, log.employee_email as employeeEmail,
              log.salary_month as salaryMonth, log.salary_year as salaryYear,
              log.salary_slip_file as salarySlipFile, log.email_subject as emailSubject,
              log.status, log.sent_at as sentAt, log.error_message as errorMessage,
              log.retry_count as retryCount, log.created_at as createdAt,
              u.full_name as employeeName
       FROM salary_slip_email_logs log
       LEFT JOIN users u ON u.employee_id = log.employee_id
       ORDER BY log.created_at DESC
       LIMIT 200`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    logger.error('Get Salary Slip Logs Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch salary slip logs.' } });
  }
}
