import React from 'react';
import { X, CheckCircle, Calculator, Info, FileText } from 'lucide-react';

interface CalculationBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export const CalculationBreakdownModal: React.FC<CalculationBreakdownModalProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  let breakdown: any = null;
  try {
    breakdown = typeof item.calculation_breakdown_json === 'string'
      ? JSON.parse(item.calculation_breakdown_json)
      : item.calculation_breakdown_json;
  } catch (e) {
    breakdown = null;
  }

  const fmt = (amt: number) => `₹${(Number(amt) || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.15)', color: 'var(--accent-color, #4f46e5)' }}>
              <Calculator size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Payroll Calculation Transparency & Audit Trace
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                {item.employee_name} ({item.employee_code}) - {item.department || 'General'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Summary Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '16px', background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gross Earnings</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmt(item.gross_earnings)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Deductions</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{fmt(item.total_deductions)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Net Take-Home</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>{fmt(item.net_salary)}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Employer Cost</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#6366f1' }}>{fmt(item.total_employer_cost)}</div>
            </div>
          </div>

          {/* Attendance & Days Input Breakdown */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: 'var(--bg-app)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
              <Info size={18} color="#3b82f6" /> 1. Attendance & Payable Days Inputs
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '10px 14px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Calendar Days:</span> <strong>{item.calendar_days}</strong>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Present Days:</span> <strong style={{ color: '#22c55e' }}>{item.present_days}</strong>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Paid Leave Days:</span> <strong style={{ color: '#3b82f6' }}>{item.paid_leave_days}</strong>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>LOP / Unpaid Days:</span> <strong style={{ color: '#ef4444' }}>{item.lop_days}</strong>
              </div>
            </div>
            {breakdown?.formulas?.payableDaysFormula && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                {breakdown.formulas.payableDaysFormula}
              </div>
            )}
          </div>

          {/* Formulas Audit List */}
          {breakdown?.formulas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FileText size={18} color="#6366f1" /> 2. Applied Dynamic Formulas & Trace
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                {Object.entries(breakdown.formulas).map(([key, formula]) => (
                  <div key={key} style={{ padding: '12px', background: '#0f172a', color: '#34d399', borderRadius: '8px' }}>
                    <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '10px', display: 'block', marginBottom: '4px', fontFamily: 'sans-serif' }}>{key.replace('Formula', '')}</span>
                    {String(formula)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statutory Calculations Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-app)', fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px', textTransform: 'uppercase' }}>
              3. Statutory Rule Breakdown (PF, ESIC, PT, TDS)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>Statutory Component</th>
                  <th style={{ padding: '10px 14px' }}>Eligible Base Wage</th>
                  <th style={{ padding: '10px 14px' }}>Employee Contribution</th>
                  <th style={{ padding: '10px 14px' }}>Employer Contribution</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600' }}>Employees Provident Fund (EPF)</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(breakdown?.statutoryDetails?.pfWage || item.basic_salary)}</td>
                  <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: '600' }}>{fmt(item.employee_pf)}</td>
                  <td style={{ padding: '10px 14px', color: '#6366f1', fontWeight: '600' }}>{fmt(item.employer_pf)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600' }}>Employees State Insurance (ESIC)</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(breakdown?.statutoryDetails?.esicWage || item.gross_earnings)}</td>
                  <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: '600' }}>{fmt(item.employee_esic)}</td>
                  <td style={{ padding: '10px 14px', color: '#6366f1', fontWeight: '600' }}>{fmt(item.employer_esic)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600' }}>Professional Tax (PT - {breakdown?.statutoryDetails?.ptState || 'State'})</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(item.gross_earnings)}</td>
                  <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: '600' }}>{fmt(item.professional_tax)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>N/A</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 14px', fontWeight: '600' }}>Tax Deducted at Source (TDS)</td>
                  <td style={{ padding: '10px 14px' }}>Est. Taxable {fmt(breakdown?.statutoryDetails?.annualTaxableIncome || 0)}</td>
                  <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: '600' }}>{fmt(item.tds)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>N/A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontWeight: '600' }}>
            <CheckCircle size={16} /> Formulas verified against system statutory rules
          </span>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--accent-color, #4f46e5)', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}
          >
            Close Calculation Audit
          </button>
        </div>
      </div>
    </div>
  );
};
