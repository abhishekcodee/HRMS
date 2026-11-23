import PDFDocument from 'pdfkit';
import { amountInWords } from './payrollCalculator.js';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthName(m: number): string {
  return MONTHS[m] || String(m);
}

const money = (v: any) => `Rs. ${(Math.round(Number(v) || 0)).toLocaleString('en-IN')}`;
const n2 = (v: any) => {
  const x = Number(v) || 0;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
};

export interface PayslipCompany {
  name: string;
  address?: string | null;
}

export function parseJson<T = any>(v: any): T | null {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v) as T; } catch { return null; }
}

/** Earnings and deductions shown on payslips (zero lines hidden). */
export function payslipLines(item: any) {
  const earnings = [
    ['Basic', item.basic_salary],
    ['House Rent Allowance', item.hra],
    ['Conveyance', item.conveyance],
    ['Medical Allowance', item.medical_allowance],
    ['Special Allowance', item.special_allowance],
    ['Other Allowances', item.other_allowances],
    ['Overtime', item.overtime_pay],
    ['Arrears', item.arrears_amount],
    ['Bonus / Incentive', item.bonus_incentive],
    ['Reimbursements', item.reimbursements_amount],
  ].filter(([, v]) => Number(v) > 0) as [string, number][];
  const deductions = [
    ['Provident Fund', item.employee_pf],
    ['ESIC', item.employee_esic],
    ['Professional Tax', item.professional_tax],
    ['Income Tax (TDS)', item.tds],
    ['Loan / Advance EMI', item.loan_emi_deduction],
    ['Other Deductions', item.other_deductions],
  ].filter(([, v]) => Number(v) > 0) as [string, number][];
  const totalEarnings = Number(item.gross_earnings || 0) + Number(item.reimbursements_amount || 0);
  return { earnings, deductions, totalEarnings };
}

export function renderPayslipPdf(item: any, run: { payroll_month: number; payroll_year: number }, company: PayslipCompany): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Payslip ${monthName(run.payroll_month)} ${run.payroll_year} - ${item.employee_name}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 40;
    const width = doc.page.width - 80;
    const accent = '#1e3a8a';
    const muted = '#64748b';
    const line = '#e2e8f0';

    // Header
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(18).text(company.name || 'Company', left, 40, { width: width - 170 });
    if (company.address) doc.fillColor(muted).font('Helvetica').fontSize(9).text(company.address, left, doc.y + 2, { width: width - 170 });
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(14).text('PAYSLIP', left + width - 170, 40, { width: 170, align: 'right' });
    doc.fillColor(muted).font('Helvetica').fontSize(10).text(`${monthName(run.payroll_month)} ${run.payroll_year}`, left + width - 170, 60, { width: 170, align: 'right' });
    let y = Math.max(doc.y, 80) + 10;
    doc.moveTo(left, y).lineTo(left + width, y).lineWidth(1.5).strokeColor(accent).stroke();
    y += 12;

    // Employee details
    const details: [string, string][] = [
      ['Employee', item.employee_name || ''],
      ['Employee Code', item.employee_code || ''],
      ['Department', item.department || '-'],
      ['Designation', item.designation || '-'],
      ['Bank', item.bank_name || '-'],
      ['Account No.', item.account_number ? String(item.account_number).replace(/.(?=.{4})/g, 'X') : '-'],
      ['PAN', item.pan || '-'],
      ['UAN', item.uan || '-'],
    ];
    const colW = width / 2;
    doc.fontSize(9);
    details.forEach(([k, v], i) => {
      const cx = left + (i % 2) * colW;
      const cy = y + Math.floor(i / 2) * 16;
      doc.fillColor(muted).font('Helvetica').text(k, cx, cy, { width: 90 });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(String(v), cx + 90, cy, { width: colW - 100 });
    });
    y += Math.ceil(details.length / 2) * 16 + 8;

    // Attendance strip
    const bd = parseJson<any>(item.calculation_breakdown_json) || {};
    const a = bd.attendanceSummary || {};
    const strip: [string, string][] = [
      ['Days in month', n2(item.calendar_days)],
      ['Paid days', n2(item.payable_days)],
      ['Present', n2(item.present_days)],
      ['Paid leave', n2(item.paid_leave_days)],
      ['LOP days', n2(item.lop_days)],
      ['Holidays + Week offs', n2((Number(a.holidays) || 0) + (Number(a.weeklyOffs) || 0))],
    ];
    doc.rect(left, y, width, 36).fillColor('#f1f5f9').fill();
    const sw = width / strip.length;
    strip.forEach(([k, v], i) => {
      doc.fillColor(muted).font('Helvetica').fontSize(8).text(k, left + i * sw, y + 6, { width: sw, align: 'center' });
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(v, left + i * sw, y + 18, { width: sw, align: 'center' });
    });
    y += 48;

    // Earnings / deductions
    const { earnings, deductions, totalEarnings } = payslipLines(item);
    const half = (width - 16) / 2;
    const tableHeader = (x: number, title: string) => {
      doc.rect(x, y, half, 20).fillColor(accent).fill();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 6, { width: half - 100 });
      doc.text('AMOUNT', x + half - 98, y + 6, { width: 90, align: 'right' });
    };
    tableHeader(left, 'EARNINGS');
    tableHeader(left + half + 16, 'DEDUCTIONS');
    let ey = y + 24;
    let dy = y + 24;
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
    for (const [k, v] of earnings) {
      doc.text(k, left + 8, ey, { width: half - 110 }).text(money(v), left + half - 98, ey, { width: 90, align: 'right' });
      ey += 16;
    }
    for (const [k, v] of deductions) {
      doc.text(k, left + half + 24, dy, { width: half - 110 }).text(money(v), left + 2 * half + 16 - 98, dy, { width: 90, align: 'right' });
      dy += 16;
    }
    if (deductions.length === 0) {
      doc.fillColor(muted).text('No deductions', left + half + 24, dy);
      dy += 16;
    }
    const by = Math.max(ey, dy) + 4;
    doc.moveTo(left, by).lineTo(left + width, by).lineWidth(0.5).strokeColor(line).stroke();
    doc.font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('Total Earnings', left + 8, by + 6, { width: half - 110 }).text(money(totalEarnings), left + half - 98, by + 6, { width: 90, align: 'right' });
    doc.text('Total Deductions', left + half + 24, by + 6, { width: half - 110 }).text(money(item.total_deductions), left + 2 * half + 16 - 98, by + 6, { width: 90, align: 'right' });
    y = by + 28;

    if (Number(item.lop_deduction_amount) > 0) {
      doc.font('Helvetica').fontSize(8).fillColor(muted).text(`Salary reduced by ${money(item.lop_deduction_amount)} for ${n2(item.lop_days)} loss-of-pay day(s).`, left, y);
      y += 14;
    }

    // Net pay
    doc.rect(left, y, width, 46).fillColor('#eff6ff').fill();
    doc.rect(left, y, 4, 46).fillColor('#2563eb').fill();
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(11).text('NET PAY', left + 14, y + 8);
    doc.fillColor(muted).font('Helvetica').fontSize(8).text(amountInWords(Number(item.net_salary)), left + 14, y + 26, { width: width - 200 });
    doc.fillColor('#1d4ed8').font('Helvetica-Bold').fontSize(18).text(money(item.net_salary), left + width - 200, y + 13, { width: 188, align: 'right' });
    y += 60;

    // Leave balance
    const leave = parseJson<any>(item.leave_summary_json);
    if (leave && (leave.cl || leave.pl)) {
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(10).text(`LEAVE BALANCE  (FY ${leave.financialYear || ''})`, left, y);
      y += 16;
      const cols = ['Leave type', 'Entitled', 'Availed', 'Applied (pending)', 'Balance'];
      const cw = width / cols.length;
      doc.rect(left, y, width, 18).fillColor('#f1f5f9').fill();
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8);
      cols.forEach((c, i) => doc.text(c, left + i * cw + 6, y + 5, { width: cw - 12, align: i === 0 ? 'left' : 'right' }));
      y += 20;
      const rows: [string, any][] = [['Casual Leave (CL)', leave.cl], ['Privilege Leave (PL)', leave.pl]];
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
      for (const [label, l] of rows) {
        if (!l) continue;
        const vals = [label, n2(l.allocated), n2(l.used), n2(l.pending), n2(l.balance)];
        vals.forEach((v, i) => {
          doc.font(i === 4 ? 'Helvetica-Bold' : 'Helvetica').text(v, left + i * cw + 6, y + 3, { width: cw - 12, align: i === 0 ? 'left' : 'right' });
        });
        y += 18;
        doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(line).stroke();
      }
      y += 10;
    }

    // Employer contributions
    const employerBits = [
      Number(item.employer_pf) > 0 ? `PF incl. EDLI & admin ${money(item.employer_pf)}` : '',
      Number(item.employer_esic) > 0 ? `ESIC ${money(item.employer_esic)}` : '',
    ].filter(Boolean);
    if (employerBits.length) {
      doc.font('Helvetica').fontSize(8).fillColor(muted).text(`Employer contributions (not deducted from your pay): ${employerBits.join(', ')}.`, left, y, { width });
      y += 14;
    }

    doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text(
      'This is a computer-generated payslip and does not require a signature.',
      left, doc.page.height - 60, { width, align: 'center' }
    );
    doc.end();
  });
}
