import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

export function sanitizeFilename(input: string): string {
  return (input || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '_');
}

export const SUPPORTED_DOCUMENT_TYPES = [
  {
    type: 'APPOINTMENT_LETTER',
    name: 'Appointment Letter',
    description: 'Official corporate letter of appointment with terms of service and salary breakdown annexure.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'letter_date', 'joining_date'],
  },
  {
    type: 'LEAVING_CERTIFICATE',
    name: 'Leaving Certificate',
    description: 'Official certificate stating employee departure date, department, and conduct.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'joining_date', 'leaving_date', 'reason_for_leaving'],
  },
  {
    type: 'EXPERIENCE_CERTIFICATE',
    name: 'Experience Certificate',
    description: 'Experience & tenure verification certificate acknowledging service contributions.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'joining_date', 'leaving_date'],
  },
  {
    type: 'RELIEVING_LETTER',
    name: 'Relieving Letter',
    description: 'Formal relieving document confirming handover & no-dues clearance.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'joining_date', 'relieving_date'],
  },
  {
    type: 'SALARY_CERTIFICATE',
    name: 'Salary Certificate',
    description: 'Official income certification for banking, visa, or financial verification.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'monthly_gross'],
  },
  {
    type: 'PAYSLIP',
    name: 'Pay Slip (Salary Slip)',
    description: 'Monthly employee pay slip statement with earnings, deductions, leave balances, and net salary paid.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'monthly_gross'],
  },
  {
    type: 'WARNING_LETTER',
    name: 'Warning / Show Cause Letter',
    description: 'Formal disciplinary notice requiring explanation response within deadline.',
    requiredFields: ['employee_name', 'employee_code', 'designation', 'letter_date', 'subject', 'issue_description'],
  },
];

/**
 * GET /api/v1/document-management/generator/types
 */
export async function getHRDocumentTypes(req: AuthRequest, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: SUPPORTED_DOCUMENT_TYPES,
  });
}

/**
 * POST /api/v1/document-management/generator/generate
 */
export async function generateHRDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      document_type,
      template_id,
      employee_id,
      salutation = 'Mr.',
      employee_name,
      employee_code,
      designation,
      department,
      document_date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      joining_date,
      leaving_date,
      relieving_date,
      monthly_gross = 0,
      annual_ctc = 0,
      basic_salary = 0,
      hra = 0,
      conveyance_allowance = 0,
      special_allowance = 0,
      other_allowances = 0,
      company_name = '',
      company_address = '',
      hr_name = '',
      hr_designation = '',
      document_data = {},
      status = 'GENERATED',
    } = req.body;

    const actorUserId = req.user?.id || 'sys-admin';
    const companyId = (req as any).user?.companyId || (req.query?.company_id as string) || (req.body?.company_id as string) || 'cmp-default-001';

    // 1. Mandatory Field Validation
    if (!employee_name || !employee_name.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Employee Name is required.' },
      });
      return;
    }

    if (!employee_code || !employee_code.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Employee ID is required.' },
      });
      return;
    }

    if (document_type === 'APPOINTMENT_LETTER' && (!joining_date || !joining_date.trim())) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Date of Joining is required for Appointment Letter.' },
      });
      return;
    }

    if (document_type === 'LEAVING_CERTIFICATE' && (!leaving_date || !leaving_date.trim())) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Date of Leaving is required for Leaving Certificate.' },
      });
      return;
    }

    if (document_type === 'RELIEVING_LETTER' && (!relieving_date || !relieving_date.trim())) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Relieving Date is required for Relieving Letter.' },
      });
      return;
    }

    if (document_type === 'WARNING_LETTER' && (!document_data.subject || !document_data.issue_description)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Subject and Issue Description are required for Warning Letter.' },
      });
      return;
    }

    const conn = await pool.getConnection();
    try {
      // 2. Check Company Letterhead Policy & Active Letterhead
      const [lhRows]: any = await conn.query(
        `SELECT id, version FROM company_letterheads WHERE company_id = ? AND is_active = 1 LIMIT 1`,
        [companyId]
      );
      const activeLetterheadId = lhRows.length > 0 ? lhRows[0].id : null;
      const activeLetterheadVersion = lhRows.length > 0 ? lhRows[0].version : 1;

      const [settingRows]: any = await conn.query(
        `SELECT require_letterhead FROM company_letterhead_settings WHERE company_id = ? LIMIT 1`,
        [companyId]
      );
      const requireLetterhead = settingRows.length > 0 ? Boolean(settingRows[0].require_letterhead) : false;

      if (requireLetterhead && !activeLetterheadId) {
        res.status(400).json({
          success: false,
          error: { code: 'LETTERHEAD_REQUIRED', message: 'No active company letterhead configured. Please upload a company letterhead first in Document Settings.' },
        });
        conn.release();
        return;
      }

      // 3. Lookup existing version number for this employee & document type
      const [verRows]: any = await conn.query(
        `SELECT COUNT(*) as verCount FROM generated_hr_documents 
         WHERE document_type = ? AND (employee_code = ? OR user_id = ?)`,
        [document_type, employee_code, employee_id || employee_code]
      );
      const versionNumber = (verRows[0]?.verCount || 0) + 1;

      // 4. Generate Sanitized PDF Filename
      const cleanEmpName = sanitizeFilename(employee_name);
      const cleanEmpCode = sanitizeFilename(employee_code);
      let typePrefix = 'Document';
      switch (document_type) {
        case 'APPOINTMENT_LETTER': typePrefix = 'Appointment_Letter'; break;
        case 'LEAVING_CERTIFICATE': typePrefix = 'Leaving_Certificate'; break;
        case 'EXPERIENCE_CERTIFICATE': typePrefix = 'Experience_Certificate'; break;
        case 'RELIEVING_LETTER': typePrefix = 'Relieving_Letter'; break;
        case 'SALARY_CERTIFICATE': typePrefix = 'Salary_Certificate'; break;
        case 'PAYSLIP': typePrefix = 'Pay_Slip'; break;
        case 'WARNING_LETTER': typePrefix = 'Warning_Letter'; break;
        default: typePrefix = sanitizeFilename(document_type); break;
      }

      const fileName = `${typePrefix}_${cleanEmpName}_${cleanEmpCode}.pdf`;
      const relativePdfPath = `/uploads/documents/generated/${fileName}`;
      const absolutePdfDir = path.join(process.cwd(), 'public', 'uploads', 'documents', 'generated');
      if (!fs.existsSync(absolutePdfDir)) {
        fs.mkdirSync(absolutePdfDir, { recursive: true });
      }

      const id = uuidv4();
      const salaryJson = JSON.stringify({
        monthlyGross: Number(monthly_gross) || 0,
        annualCtc: Number(annual_ctc) || 0,
        basicSalary: Number(basic_salary) || 0,
        hra: Number(hra) || 0,
        conveyanceAllowance: Number(conveyance_allowance) || 0,
        specialAllowance: Number(special_allowance) || 0,
        otherAllowances: Number(other_allowances) || 0,
      });

      const companyJson = JSON.stringify({
        companyName: company_name,
        companyAddress: company_address,
      });

      const docDataJson = JSON.stringify(document_data);

      // 5. Insert into generated_hr_documents table
      await conn.query(
        `INSERT INTO generated_hr_documents (
          id, company_id, letterhead_id, letterhead_version, document_type, template_id,
          template_version, user_id, employee_salutation, employee_name, employee_code,
          designation, department, document_date, joining_date, leaving_date, relieving_date,
          salary_details_json, document_data_json, company_details_json, hr_name, hr_designation,
          file_path, status, generated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          companyId,
          activeLetterheadId,
          activeLetterheadVersion,
          document_type,
          template_id || null,
          versionNumber,
          employee_id || null,
          salutation,
          employee_name,
          employee_code,
          designation,
          department,
          document_date,
          joining_date || null,
          leaving_date || null,
          relieving_date || null,
          salaryJson,
          docDataJson,
          companyJson,
          hr_name,
          hr_designation,
          relativePdfPath,
          status,
          actorUserId,
        ]
      );

      // If Appointment Letter, also insert into legacy employee_appointment_letters for 100% backward compatibility
      if (document_type === 'APPOINTMENT_LETTER') {
        const legacyRef = `APPT/${new Date().getFullYear()}/${String(versionNumber).padStart(5, '0')}`;
        await conn.query(
          `INSERT INTO employee_appointment_letters (
            id, user_id, employee_name, employee_code, designation, joining_date, acceptance_date,
            reference_number, version_number, generated_date, annual_ctc, monthly_gross,
            basic_salary, allowances, other_components, salary_details_json, company_details_json,
            hr_name, hr_designation, status, pdf_path, generated_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            employee_id || null,
            employee_name,
            employee_code,
            designation,
            joining_date || document_date,
            document_date,
            legacyRef,
            versionNumber,
            document_date,
            Number(annual_ctc) || 0,
            Number(monthly_gross) || 0,
            Number(basic_salary) || 0,
            (Number(hra) || 0) + (Number(conveyance_allowance) || 0),
            Number(special_allowance) || 0,
            salaryJson,
            companyJson,
            hr_name,
            hr_designation,
            status,
            relativePdfPath,
            actorUserId,
          ]
        );
      }

      res.status(201).json({
        success: true,
        data: {
          id,
          documentType: document_type,
          employeeName: employee_name,
          employeeCode: employee_code,
          designation,
          department,
          versionNumber,
          documentDate: document_date,
          pdfPath: relativePdfPath,
          fileName,
          status,
        },
      });
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Generate HR Document Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' },
    });
  }
}

/**
 * GET /api/v1/document-management/generator/history
 */
export async function getHRDocumentsHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    const typeFilter = req.query.type as string;

    const conn = await pool.getConnection();
    try {
      let sql = `
        SELECT g.id, g.document_type as documentType, g.template_id as templateId,
               g.template_version as versionNumber, g.user_id as userId,
               g.employee_name as employeeName, g.employee_code as employeeCode,
               g.designation, g.department, g.document_date as documentDate,
               g.joining_date as joiningDate, g.leaving_date as leavingDate,
               g.relieving_date as relievingDate, g.salary_details_json as salaryDetailsJson,
               g.document_data_json as documentDataJson, g.company_details_json as companyDetailsJson,
               g.hr_name as hrName, g.hr_designation as hrDesignation,
               g.file_path as pdfPath, g.status, g.created_at as createdAt,
               u.full_name as generatedByName
        FROM generated_hr_documents g
        LEFT JOIN users u ON u.id = g.generated_by
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (role === 'employee') {
        conditions.push(`(g.user_id = ? OR g.employee_code = ?)`);
        params.push(userId, req.user?.employeeId || userId);
      }

      if (typeFilter) {
        conditions.push(`g.document_type = ?`);
        params.push(typeFilter);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
      }

      sql += ` ORDER BY g.created_at DESC`;

      const [rows]: any = await conn.query(sql, params);

      const formatted = rows.map((r: any) => ({
        ...r,
        salaryDetails: r.salaryDetailsJson ? JSON.parse(r.salaryDetailsJson) : null,
        documentData: r.documentDataJson ? JSON.parse(r.documentDataJson) : null,
        companyDetails: r.companyDetailsJson ? JSON.parse(r.companyDetailsJson) : null,
      }));

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Get HR Documents History Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' },
    });
  }
}
