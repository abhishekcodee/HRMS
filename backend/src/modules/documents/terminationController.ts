import { Request, Response } from 'express';
import { pool } from '../../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { formatFormalDate, resolveIndianFinancialYear } from '@hrms/shared';

/**
 * Termination Letter Module Controller — Manages 3 Legal Variants, Attachment Validation, Approval Workflow & Postal Delivery Tracking
 */

export const getTerminationTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { company_id } = req.query;
    const [rows]: any = await pool.query(
      'SELECT * FROM termination_templates WHERE company_id = ? OR company_id IS NULL ORDER BY variant_code ASC',
      [company_id || null]
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const draftTerminationLetter = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      company_id,
      employee_id,
      variant_code,
      last_working_day,
      separation_data,
      attachments,
    } = req.body;

    if (!employee_id || !variant_code || !last_working_day) {
      res.status(400).json({ success: false, error: { message: 'Employee ID, Variant Code, and Last Working Day are required' } });
      return;
    }

    const id = uuidv4();
    const refNumber = `TERM-DRAFT-${id.slice(0, 8)}`;
    const issuedDate = new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO issued_termination_letters (
        id, company_id, employee_id, variant_code, ref_number, issued_date,
        last_working_day, separation_data_json, attachments_json, status, requested_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [
        id,
        company_id || null,
        employee_id,
        variant_code,
        refNumber,
        issuedDate,
        last_working_day,
        JSON.stringify(separation_data || {}),
        JSON.stringify(attachments || {}),
        (req as any).user?.id || null,
      ]
    );

    res.json({ success: true, data: { id, status: 'DRAFT' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const submitTerminationForApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { attachments } = req.body;

    // Fetch existing request
    const [rows]: any = await pool.query('SELECT * FROM issued_termination_letters WHERE id = ?', [id]);
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Termination request not found' } });
      return;
    }

    const record = rows[0];
    const updatedAttachments = attachments || JSON.parse(record.attachments_json || '{}');

    // Mandatory Attachments Validation for Variant 2 (misconduct)
    if (record.variant_code === 'misconduct') {
      const { show_cause_url, employee_reply_url, inquiry_report_url } = updatedAttachments;
      if (!show_cause_url || !employee_reply_url || !inquiry_report_url) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Variant 2 (Termination for Misconduct) MANDATES all 3 attachments: Show Cause Notice, Employee Reply, and Inquiry Report. Submission blocked.',
            missing_attachments: {
              show_cause_url: Boolean(show_cause_url),
              employee_reply_url: Boolean(employee_reply_url),
              inquiry_report_url: Boolean(inquiry_report_url),
            },
          },
        });
        return;
      }
    }

    await pool.query(
      `UPDATE issued_termination_letters 
       SET status = 'PENDING_APPROVAL', attachments_json = ? 
       WHERE id = ?`,
      [JSON.stringify(updatedAttachments), id]
    );

    res.json({ success: true, message: 'Termination request submitted for 2nd approver review successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const approveTerminationLetter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body; // 'approve' | 'reject'
    const approverId = (req as any).user?.id || 'admin-approver';

    if (action === 'reject') {
      await pool.query(
        `UPDATE issued_termination_letters 
         SET status = 'REJECTED', rejection_reason = ?, approved_by = ?, approved_at = NOW() 
         WHERE id = ?`,
        [rejection_reason || 'Rejected by management approver', approverId, id]
      );
      res.json({ success: true, message: 'Termination request rejected.' });
      return;
    }

    // Action = Approve
    await pool.query(
      `UPDATE issued_termination_letters 
       SET status = 'APPROVED', approved_by = ?, approved_at = NOW() 
       WHERE id = ?`,
      [approverId, id]
    );

    res.json({ success: true, message: 'Termination request approved by 2nd approver successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const issueTerminationLetter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { html_snapshot } = req.body;

    const [rows]: any = await pool.query('SELECT * FROM issued_termination_letters WHERE id = ?', [id]);
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Termination letter record not found' } });
      return;
    }

    const record = rows[0];
    const fy = resolveIndianFinancialYear(record.issued_date);
    const seq = Math.floor(Math.random() * 9000) + 1000;
    const officialRefNumber = `AM/HR/TERM/${fy}/${String(seq).padStart(4, '0')}`;

    await pool.query(
      `UPDATE issued_termination_letters 
       SET ref_number = ?, status = 'ISSUED', rendered_content_snapshot = ?, pdf_path = ? 
       WHERE id = ?`,
      [officialRefNumber, html_snapshot || null, `/documents/termination_${id}.pdf`, id]
    );

    res.json({
      success: true,
      data: {
        id,
        ref_number: officialRefNumber,
        status: 'ISSUED',
        pdf_path: `/documents/termination_${id}.pdf`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const updateDeliveryRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { delivery_status, postal_receipt_url, postal_tracking_number, delivery_notes } = req.body;

    await pool.query(
      `UPDATE issued_termination_letters 
       SET delivery_status = ?, postal_receipt_url = ?, postal_tracking_number = ?, delivery_notes = ? 
       WHERE id = ?`,
      [
        delivery_status || 'dispatched_registered_post_ad',
        postal_receipt_url || null,
        postal_tracking_number || null,
        delivery_notes || null,
        id,
      ]
    );

    res.json({ success: true, message: 'Termination letter delivery record updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getEmployeeTerminationLetters = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const [rows]: any = await pool.query(
      `SELECT itl.*, u.full_name as employee_name, u.employee_id as employee_code
       FROM issued_termination_letters itl
       JOIN users u ON u.id = itl.employee_id
       WHERE itl.employee_id = ?
       ORDER BY itl.created_at DESC`,
      [employeeId]
    );

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
