import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Generate Bank Payment Batch for a Payroll Run
 */
export async function generateBankTransferBatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { payrollRunId } = req.body;
    if (!payrollRunId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Payroll Run ID is required.' } });
      return;
    }

    const [items]: any = await pool.query(
      `SELECT * FROM payroll_items WHERE payroll_run_id = ? AND net_salary > 0`,
      [payrollRunId]
    );

    let batchCount = 0;
    for (const item of items) {
      const payId = uuidv4();
      await pool.query(
        `INSERT INTO bank_payments
         (id, payroll_run_id, employee_id, employee_code, employee_name, bank_name, account_number, ifsc, amount, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
         ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
        [
          payId,
          payrollRunId,
          item.employee_id,
          item.employee_code,
          item.employee_name,
          item.bank_name || 'HDFC Bank',
          item.account_number || '0000000000',
          item.ifsc || 'HDFC0001234',
          item.net_salary,
        ]
      );
      batchCount++;
    }

    res.json({ success: true, message: `Bank transfer payment batch generated for ${batchCount} employees.` });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate bank transfer batch.' } });
  }
}

/**
 * Get Bank Transfer Batch Records
 */
export async function getBankTransferBatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { payrollRunId } = req.query;
    let sql = `SELECT * FROM bank_payments ORDER BY employee_code ASC`;
    let params: any[] = [];
    if (payrollRunId) {
      sql = `SELECT * FROM bank_payments WHERE payroll_run_id = ? ORDER BY employee_code ASC`;
      params = [payrollRunId];
    }
    const [rows]: any = await pool.query(sql, params);

    if (req.query.export === 'csv') {
      let csv = 'Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Salary,Payment Status\n';
      for (const r of rows) {
        csv += `"${r.employee_code}","${r.employee_name}","${r.bank_name}","${r.account_number}","${r.ifsc}",${r.amount},"${r.payment_status}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="Salary_Bank_Transfer_Batch.csv"');
      res.send(csv);
      return;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch bank transfer batch.' } });
  }
}

/**
 * Mark Bank Payment Status (Paid / Processing)
 */
export async function updateBankPaymentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionRef } = req.body;

    await pool.query(
      `UPDATE bank_payments 
       SET payment_status = ?, transaction_ref = ?, paid_at = IF(? = 'PAID', NOW(), paid_at)
       WHERE id = ?`,
      [paymentStatus, transactionRef || null, paymentStatus, id]
    );

    res.json({ success: true, message: 'Bank payment status updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update bank payment status.' } });
  }
}
