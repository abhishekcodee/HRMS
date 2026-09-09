import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import fs from 'fs';

export interface TemplateConfig {
  id: string;
  name: string;
  companyName: string;
  companyTagline?: string;
  companyLogo?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  accentColor: string;
  fontFamily: string;
  letterTitle: string;
  referencePrefix: string;
  openingTemplate?: string;
  termsAndConditions: Array<{ title: string; text: string }>;
  signatoryName: string;
  signatoryDesignation: string;
  signatorySignature?: string;
  acceptanceText?: string;
  footerText?: string;
  sectionsOrder: string[];
  sectionsVisibility: Record<string, boolean>;
  isActive: boolean;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * 1. GET /api/v1/appointment-letters/templates/default — Fetch active template config
 */
export async function getDefaultTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT * FROM appointment_letter_templates WHERE is_active = 1 LIMIT 1`
    );

    if (rows.length === 0) {
      res.json({
        success: true,
        data: {
          id: 'default-template',
          name: 'Standard Appointment Template',
          companyName: 'Acme Global Technologies Pvt. Ltd.',
          companyAddress: 'Plot 42, Rabale MIDC, Industrial Area, Navi Mumbai, MH 400701',
          primaryBrandColor: '#1E3A5F',
          secondaryBrandColor: '#0F172A',
          accentColor: '#3B82F6',
          fontFamily: 'Plus Jakarta Sans',
          letterTitle: 'Letter of Appointment',
          referencePrefix: 'APPT/2026/',
          signatoryName: 'Rajesh Sharma',
          signatoryDesignation: 'Head of Human Resources',
          termsAndConditions: [
            {
              title: 'Posting & Transfer',
              text: 'Your services are liable to be transferred, at the sole discretion of Management, in such other capacity as the company may determine, to any department / section, location, associate, sister concern or subsidiary, at any place in India or abroad, whether existing today or which may come up in future. In such a case, you will be governed by the terms and conditions of the service applicable at the new placement location.',
            },
            {
              title: 'Probation',
              text: 'That you will be on probation for a period of six months. The period of probation can be extended at the discretion of the Management and you will continue to be on probation till an order of confirmation has been issued in writing.',
            },
            {
              title: 'Full time employment',
              text: 'Your position is a whole time employment with the Company and you shall devote yourself exclusively to the business and interests of the company. You will not take up any other work for remuneration (part time or otherwise) or work in an advisory capacity, or be interested directly or indirectly (except as shareholder / debenture holder), in any other trade or business during your employment with the company, without permission in writing of the Management of the Company. You will also not seek membership of any local or public bodies without first obtaining specific permission from the Management.',
            },
            {
              title: 'Confidentiality',
              text: 'You will not, at any time, during the employment or after, without the consent of the Management disclose or divulge or make public, except on legal obligations, any information regarding the Company’s affairs or administration or research carried out, whether the same is confided to you or becomes known to you in the course of your service or otherwise.',
            },
            {
              title: 'Intellectual Property',
              text: 'If you conceive any new or advanced method of improving designs/ processes/ formulae/ systems, etc. in relation to the business/ operations of the Company, such developments will be fully communicated to the company and will be, and remain, the sole right/ property of the Company.',
            },
            {
              title: 'Responsibilities & Duties',
              text: 'Your work in the organization will be subject to the rules and regulations of the organization as laid down in relation to conduct, discipline and other matters. You will always be alive to responsibilities and duties attached to your office and conduct yourself accordingly. You must effectively perform to ensure results.',
            },
            {
              title: 'Past Records',
              text: 'This letter of appointment is based on the information furnished in your application for employment and during the interviews you had with us. If any declaration given, or information furnished by you, to the company proves to be false, or if you are found to have willfully suppressed any material information, in such cases, you will be liable to removal from services without any notice.',
            },
            {
              title: 'Termination of employment',
              text: 'During the probationary period and any extension thereof, your services may be terminated without giving any notice or salary in lieu thereof. However, on confirmation the services can be terminated from either side by giving one month (30 days) notice or salary in lieu thereof.\n\nUpon resignation/termination of employment, you will immediately hand over to the Company all correspondence, specifications, formulae, books, documents, market data, cost data, drawings, affects or records belonging to the Company or relating to its business and shall not retain or make copies of these items.\n\nUpon resignation/termination of employment, you will also return all company property, which may be in your possession.\n\nNotwithstanding the above condition, the contract of service may also be terminated because of under mentioned stipulations. This will be without payment of any compensation:\n• If you fail, refuse or neglect to carry out and perform your duties assigned to you by the company.\n• For loss of confidence in you by the company for any of the act committed by you.\n• If you are found to be guilty of fraud, insubordination or misconduct whether in course of performance of duties entrusted to you or otherwise.\n• If you are found unfit for being entrusted with the responsible work commensurate with your position in consequences of any misconduct, moral turpitude. * If you commit any act prejudicial to the continuing good relationship between you and the company.\n• If you commit breach of any of the terms of this letter of appointment.',
            },
            {
              title: 'Authority',
              text: 'No authority is vested upon you to make any financial commitment and enter into agreements/contracts/understandings of any nature with any second party and third party without seeking the prior permission/approval of the management. Any violation to exceed your specified authority as mentioned will be seriously viewed and disciplinary/appropriate legal action will be taken.\n\nIf you agree to the above terms and conditions of the appointment, kindly confirm your acceptance by signing and returning the duplicate copy of this letter for our file and records.',
            },
          ],
        },
      });
      return;
    }

    const raw = rows[0];
    res.json({
      success: true,
      data: {
        id: raw.id,
        name: raw.name,
        companyName: raw.company_name,
        companyTagline: raw.company_tagline,
        companyLogo: raw.company_logo,
        companyAddress: raw.company_address,
        companyEmail: raw.company_email,
        companyPhone: raw.company_phone,
        companyWebsite: raw.company_website,
        primaryBrandColor: raw.primary_brand_color || '#1E3A5F',
        secondaryBrandColor: raw.secondary_brand_color || '#0F172A',
        accentColor: raw.accent_color || '#3B82F6',
        fontFamily: raw.font_family || 'Plus Jakarta Sans',
        letterTitle: raw.letter_title || 'Letter of Appointment',
        referencePrefix: raw.reference_prefix || 'APPT/2026/',
        openingTemplate: raw.opening_template,
        termsAndConditions: raw.terms_and_conditions ? JSON.parse(raw.terms_and_conditions) : [],
        signatoryName: raw.signatory_name,
        signatoryDesignation: raw.signatory_designation,
        signatorySignature: raw.signatory_signature,
        acceptanceText: raw.acceptance_text,
        footerText: raw.footer_text,
        sectionsOrder: raw.sections_order ? JSON.parse(raw.sections_order) : [],
        sectionsVisibility: raw.sections_visibility ? JSON.parse(raw.sections_visibility) : {},
        isActive: Boolean(raw.is_active),
      },
    });
  } catch (error: any) {
    logger.error('Get Default Template Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch default template.' } });
  }
}

/**
 * 2. POST /api/v1/appointment-letters/templates — Create or update template settings
 */
export async function saveTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      id,
      name = 'Standard Corporate Template',
      companyName,
      companyAddress,
      primaryBrandColor = '#1E3A5F',
      letterTitle = 'Letter of Appointment',
      referencePrefix = 'APPT/2026/',
      termsAndConditions,
      signatoryName = 'Head of HR',
      signatoryDesignation = 'Authorized Signatory',
    } = req.body;

    const templateId = id || uuidv4();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [existing]: any = await conn.query('SELECT id FROM appointment_letter_templates WHERE id = ?', [templateId]);
      if (existing.length > 0) {
        await conn.query(
          `UPDATE appointment_letter_templates SET
            name = ?, company_name = ?, company_address = ?, primary_brand_color = ?,
            letter_title = ?, reference_prefix = ?, terms_and_conditions = ?,
            signatory_name = ?, signatory_designation = ?
           WHERE id = ?`,
          [
            name, companyName, companyAddress, primaryBrandColor,
            letterTitle, referencePrefix, JSON.stringify(termsAndConditions || []),
            signatoryName, signatoryDesignation, templateId
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO appointment_letter_templates (
            id, name, company_name, company_address, primary_brand_color,
            letter_title, reference_prefix, terms_and_conditions,
            signatory_name, signatory_designation, is_active
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            templateId, name, companyName, companyAddress, primaryBrandColor,
            letterTitle, referencePrefix, JSON.stringify(termsAndConditions || []),
            signatoryName, signatoryDesignation
          ]
        );
      }

      await conn.commit();
      res.json({ success: true, message: 'Template saved successfully.', templateId });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Save Template Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to save template.' } });
  }
}

/**
 * 3. POST /api/v1/appointment-letters/generate — Generate versioned appointment letter
 */
export async function generateAppointmentLetter(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      employee_id,
      employee_name,
      employee_code,
      designation,
      letter_date,
      joining_date,
      acceptance_date,
      monthly_gross,
      annual_ctc,
      basic_salary,
      hra,
      conveyance_allowance,
      special_allowance,
      other_allowances,
      company_name,
      company_address,
      hr_name,
      hr_designation,
      status = 'GENERATED',
    } = req.body;

    // Strict Validations (Section 13 of Prompt)
    if (!employee_name || !employee_name.trim()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee Name is required.' } });
      return;
    }
    if (!designation || !designation.trim()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Designation is required.' } });
      return;
    }
    if (!employee_code || !employee_code.trim()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee ID is required.' } });
      return;
    }
    if (!letter_date || !letter_date.trim()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Appointment Letter Date is required.' } });
      return;
    }
    if (!joining_date || !joining_date.trim()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Date of Joining is required.' } });
      return;
    }

    const empNameClean = employee_name.trim();
    const empCodeClean = employee_code.trim();
    const desigClean = designation.trim();
    const letterDateClean = letter_date.trim();
    const joiningDateClean = joining_date.trim();
    const acceptDateClean = acceptance_date ? acceptance_date.trim() : letterDateClean;

    // Determine version number for this employee ID
    const [verRows]: any = await pool.query(
      `SELECT COUNT(*) as verCount FROM employee_appointment_letters WHERE employee_code = ? OR user_id = ?`,
      [empCodeClean, employee_id || empCodeClean]
    );
    const versionNumber = (verRows[0]?.verCount || 0) + 1;

    const refNumber = `APPT/2026/${String(versionNumber).padStart(5, '0')}`;
    const docId = uuidv4();

    // Sanitize filename: Appointment_Letter_[Employee_Name]_[Employee_ID].pdf
    const fileName = `Appointment_Letter_${sanitizeFilename(empNameClean)}_${sanitizeFilename(empCodeClean)}.pdf`;
    const pdfPath = `/uploads/documents/appointment_letters/${fileName}`;

    const salaryDetailsJson = JSON.stringify({
      monthlyGross: monthly_gross ? parseFloat(monthly_gross) : 0,
      annualCtc: annual_ctc ? parseFloat(annual_ctc) : 0,
      basicSalary: basic_salary ? parseFloat(basic_salary) : 0,
      hra: hra ? parseFloat(hra) : 0,
      conveyanceAllowance: conveyance_allowance ? parseFloat(conveyance_allowance) : 0,
      specialAllowance: special_allowance ? parseFloat(special_allowance) : 0,
      otherAllowances: other_allowances ? parseFloat(other_allowances) : 0,
    });

    const companyDetailsJson = JSON.stringify({
      companyName: company_name || '',
      companyAddress: company_address || '',
    });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO employee_appointment_letters (
          id, user_id, employee_name, employee_code, designation, joining_date, acceptance_date,
          reference_number, version_number, generated_date, annual_ctc, monthly_gross,
          basic_salary, allowances, other_components, salary_details_json, company_details_json,
          hr_name, hr_designation, status, pdf_path, generated_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          employee_id || null,
          empNameClean,
          empCodeClean,
          desigClean,
          joiningDateClean,
          acceptDateClean,
          refNumber,
          versionNumber,
          letterDateClean,
          annual_ctc ? parseFloat(annual_ctc) : 0,
          monthly_gross ? parseFloat(monthly_gross) : 0,
          basic_salary ? parseFloat(basic_salary) : 0,
          hra ? parseFloat(hra) : 0,
          other_allowances ? parseFloat(other_allowances) : 0,
          salaryDetailsJson,
          companyDetailsJson,
          hr_name || '',
          hr_designation || '',
          status,
          pdfPath,
          req.user?.id || null,
        ]
      );

      // Insert record into general employee_documents if employee_id present
      if (employee_id) {
        const empDocId = uuidv4();
        await conn.query(
          `INSERT INTO employee_documents (id, user_id, title, document_type, file_url, file_size)
           VALUES (?, ?, ?, 'Appointment Letter', ?, 'PDF Document')`,
          [empDocId, employee_id, `Appointment Letter - ${empNameClean} (${refNumber})`, pdfPath]
        );
      }

      await conn.commit();

      res.status(201).json({
        success: true,
        message: `Appointment letter generated successfully for ${empNameClean}.`,
        data: {
          id: docId,
          employeeName: empNameClean,
          employeeCode: empCodeClean,
          designation: desigClean,
          letterDate: letterDateClean,
          joiningDate: joiningDateClean,
          acceptanceDate: acceptDateClean,
          referenceNumber: refNumber,
          versionNumber,
          pdfPath,
          status,
          fileName,
        },
      });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Generate Appointment Letter Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to generate appointment letter.' } });
  }
}

/**
 * 4. GET /api/v1/appointment-letters/history — Fetch history of all generated appointment letters
 */
export async function getAppointmentLettersHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT eal.id, eal.user_id as userId, eal.employee_name as employeeName, eal.employee_code as employeeCode,
              eal.designation, eal.joining_date as joiningDate, eal.acceptance_date as acceptanceDate,
              eal.reference_number as referenceNumber, eal.version_number as versionNumber,
              eal.generated_date as generatedDate, eal.annual_ctc as annualCtc, eal.monthly_gross as monthlyGross,
              eal.basic_salary as basicSalary, eal.salary_details_json as salaryDetailsJson,
              eal.company_details_json as companyDetailsJson, eal.hr_name as hrName, eal.hr_designation as hrDesignation,
              eal.status, eal.pdf_path as pdfPath, eal.created_at as createdAt
       FROM employee_appointment_letters eal
       ORDER BY eal.created_at DESC`
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Appointment Letters History Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch appointment letters history.' } });
  }
}

/**
 * 5. GET /api/v1/appointment-letters/employee/:employeeId — Fetch versions for single employee
 */
export async function getEmployeeAppointmentLetters(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params;

    const [rows]: any = await pool.query(
      `SELECT eal.*
       FROM employee_appointment_letters eal
       WHERE eal.user_id = ? OR eal.employee_code = ?
       ORDER BY eal.version_number DESC`,
      [employeeId, employeeId]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Employee Appointment Letters Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch appointment letters.' } });
  }
}

/**
 * 6. GET /api/v1/appointment-letters/:id — Fetch single record details
 */
export async function getAppointmentLetterById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.query(
      `SELECT eal.* FROM employee_appointment_letters eal WHERE eal.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment letter not found.' } });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error: any) {
    logger.error('Get Appointment Letter By ID Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch appointment letter details.' } });
  }
}
