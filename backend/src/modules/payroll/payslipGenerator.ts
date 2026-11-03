import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Generate HTML Payslip Content with Corporate Branding & Formula Breakdown
 */
export function renderPayslipHtml(item: any, companyInfo: any): string {
  const earnings = [
    { label: 'Basic Salary', amount: Number(item.basic_salary) || 0 },
    { label: 'House Rent Allowance (HRA)', amount: Number(item.hra) || 0 },
    { label: 'Conveyance Allowance', amount: Number(item.conveyance) || 0 },
    { label: 'Special Allowance', amount: Number(item.special_allowance) || 0 },
    { label: 'Medical Allowance', amount: Number(item.medical_allowance) || 0 },
    { label: 'Overtime Pay', amount: Number(item.overtime_pay) || 0 },
    { label: 'Bonus / Incentive', amount: Number(item.bonus_incentive) || 0 },
  ].filter((e) => e.amount > 0);

  const deductions = [
    { label: 'Employee PF', amount: Number(item.employee_pf) || 0 },
    { label: 'Employee ESIC', amount: Number(item.employee_esic) || 0 },
    { label: 'Professional Tax (PT)', amount: Number(item.professional_tax) || 0 },
    { label: 'Tax Deducted at Source (TDS)', amount: Number(item.tds) || 0 },
    { label: 'Loan / Advance EMI', amount: Number(item.loan_emi_deduction) || 0 },
    { label: 'Other Deductions', amount: Number(item.other_deductions) || 0 },
  ].filter((d) => d.amount > 0);

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthStr = monthNames[item.payroll_month] || 'Month';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Payslip - ${item.employee_name} (${monthStr} ${item.payroll_year})</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; }
      .payslip-card { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
      .company-title { font-size: 24px; font-weight: 700; color: #1e3a8a; }
      .company-sub { font-size: 13px; color: #64748b; }
      .payslip-title { text-align: right; }
      .payslip-title h2 { margin: 0; color: #2563eb; font-size: 20px; }
      .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
      .emp-grid div span { font-weight: 600; color: #334155; }
      .tables-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f8fafc; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; color: #475569; }
      td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
      .amount-col { text-align: right; }
      .net-box { background: #eff6ff; border: 2px dashed #3b82f6; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
      .net-title { font-size: 16px; font-weight: 700; color: #1e40af; }
      .net-amount { font-size: 24px; font-weight: 800; color: #1d4ed8; }
      .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
    </style>
  </head>
  <body>
    <div class="payslip-card">
      <div class="header">
        <div>
          <div class="company-title">${companyInfo.name || 'Enterprise HRMS Inc.'}</div>
          <div class="company-sub">${companyInfo.address || 'Corporate Office | HR & Payroll Services'}</div>
        </div>
        <div class="payslip-title">
          <h2>PAYSLIP</h2>
          <div class="company-sub">${monthStr.toUpperCase()} ${item.payroll_year}</div>
        </div>
      </div>

      <div class="emp-grid">
        <div><span>Employee Name:</span> ${item.employee_name}</div>
        <div><span>Employee Code:</span> ${item.employee_code}</div>
        <div><span>Department:</span> ${item.department || 'N/A'}</div>
        <div><span>Designation:</span> ${item.designation || 'N/A'}</div>
        <div><span>Bank Name:</span> ${item.bank_name || 'N/A'}</div>
        <div><span>Account No:</span> ${item.account_number || 'N/A'}</div>
        <div><span>IFSC Code:</span> ${item.ifsc || 'N/A'}</div>
        <div><span>PAN / UAN:</span> ${item.pan || 'N/A'} / ${item.uan || 'N/A'}</div>
        <div><span>Payable Days:</span> ${item.payable_days} / ${item.calendar_days} Days</div>
        <div><span>LOP Days:</span> ${item.lop_days} Days</div>
      </div>

      <div class="tables-container">
        <div>
          <table>
            <thead>
              <tr><th>EARNINGS</th><th class="amount-col">AMOUNT (₹)</th></tr>
            </thead>
            <tbody>
              ${earnings.map((e) => `<tr><td>${e.label}</td><td class="amount-col">₹${e.amount.toLocaleString('en-IN')}</td></tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: 700; background: #f8fafc;">
                <td>GROSS EARNINGS</td>
                <td class="amount-col">₹${Number(item.gross_earnings).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div>
          <table>
            <thead>
              <tr><th>DEDUCTIONS</th><th class="amount-col">AMOUNT (₹)</th></tr>
            </thead>
            <tbody>
              ${deductions.map((d) => `<tr><td>${d.label}</td><td class="amount-col">₹${d.amount.toLocaleString('en-IN')}</td></tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight: 700; background: #f8fafc;">
                <td>TOTAL DEDUCTIONS</td>
                <td class="amount-col">₹${Number(item.total_deductions).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="net-box">
        <div>
          <div class="net-title">NET SALARY PAYABLE</div>
          <div style="font-size: 12px; color: #3b82f6;">Transferable to registered bank account</div>
        </div>
        <div class="net-amount">₹${Number(item.net_salary).toLocaleString('en-IN')}</div>
      </div>

      <div class="footer">
        This is a computer-generated salary document and does not require a physical signature.<br/>
        Generated on ${new Date().toLocaleDateString()} | HRMS Enterprise Payroll Engine
      </div>
    </div>
  </body>
  </html>
  `;
}

import { getTenantId } from '../../middleware/tenantMiddleware.js';

/**
 * Download or View Payslip HTML/PDF (Tenant & IDOR Isolated)
 */
export async function getPayslipById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { itemId } = req.params;
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    let query = `SELECT * FROM payroll_items WHERE (id = ? OR employee_id = ?)`;
    const params: any[] = [itemId, itemId];
    if (!isSuperGlobal) {
      query += ` AND company_id = ?`;
      params.push(companyId);
    }
    query += ` LIMIT 1`;

    const [rows]: any = await pool.query(query, params);

    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payslip record not found in company database.' } });
      return;
    }

    const item = rows[0];

    // IDOR check for standard employee: cannot view other employee's payslip
    if (req.user?.role === 'employee' && item.employee_id !== req.user.id && item.employee_code !== req.user.employeeId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access Denied: You are not authorized to view another employee payslip.' } });
      return;
    }

    // Fetch company branding name & address
    const [compRows]: any = await pool.query('SELECT name, address FROM companies WHERE id = ?', [item.company_id || companyId]);
    const companyInfo = compRows.length > 0 ? compRows[0] : { name: 'HRMS Enterprise', address: 'Main Corporate Headquarters' };

    const html = renderPayslipHtml(item, companyInfo);

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }

    res.json({
      success: true,
      data: {
        item,
        htmlContent: html,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate payslip.' } });
  }
}
