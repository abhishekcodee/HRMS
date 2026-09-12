import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get Comprehensive HR & Payroll Reports
 */
export async function getPayrollReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reportType, month, year, department, format } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();

    let sql = ``;
    let params: any[] = [];

    switch (reportType) {
      case 'salary_register':
      case 'monthly_payroll':
        sql = `SELECT pi.*, pr.status as runStatus, pr.financial_year as financialYear
               FROM payroll_items pi
               JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
               WHERE pr.payroll_month = ? AND pr.payroll_year = ?`;
        params = [m, y];
        if (department) {
          sql += ` AND pi.department = ?`;
          params.push(department);
        }
        sql += ` ORDER BY pi.employee_code ASC`;
        break;

      case 'pf_report':
        sql = `SELECT pi.employee_code, pi.employee_name, pi.pan, pi.uan,
                      pi.basic_salary, pi.earned_basic as pfWage, pi.employee_pf, pi.employer_pf
               FROM payroll_items pi
               JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
               WHERE pr.payroll_month = ? AND pr.payroll_year = ? AND pi.employee_pf > 0`;
        params = [m, y];
        break;

      case 'esic_report':
        sql = `SELECT pi.employee_code, pi.employee_name, pi.gross_earnings as esicWage,
                      pi.employee_esic, pi.employer_esic
               FROM payroll_items pi
               JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
               WHERE pr.payroll_month = ? AND pr.payroll_year = ? AND pi.employee_esic > 0`;
        params = [m, y];
        break;

      case 'pt_report':
        sql = `SELECT pi.employee_code, pi.employee_name, pi.gross_earnings, pi.professional_tax
               FROM payroll_items pi
               JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
               WHERE pr.payroll_month = ? AND pr.payroll_year = ? AND pi.professional_tax > 0`;
        params = [m, y];
        break;

      case 'tds_report':
        sql = `SELECT pi.employee_code, pi.employee_name, pi.pan, pi.gross_earnings, pi.tds
               FROM payroll_items pi
               JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
               WHERE pr.payroll_month = ? AND pr.payroll_year = ? AND pi.tds > 0`;
        params = [m, y];
        break;

      default:
        sql = `SELECT pi.* FROM payroll_items pi
               JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
               WHERE pr.payroll_month = ? AND pr.payroll_year = ?`;
        params = [m, y];
        break;
    }

    const [rows]: any = await pool.query(sql, params);

    if (format === 'csv') {
      if (rows.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.send('No records found for the selected filter');
        return;
      }
      const keys = Object.keys(rows[0]);
      let csv = keys.join(',') + '\n';
      for (const r of rows) {
        csv += keys.map((k) => `"${r[k] !== null && r[k] !== undefined ? r[k] : ''}"`).join(',') + '\n';
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType || 'payroll'}_report_${m}_${y}.csv"`);
      res.send(csv);
      return;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate report.' } });
  }
}
