import React, { useEffect, useState } from 'react';
import { Download, Receipt } from 'lucide-react';
import '../styles/payroll.css';
import { MONTHS, inr, num, openAuthedFile, payrollRunApi } from '../services/payrollRunApi';

export const MyPayslipsPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    payrollRunApi.myPayslips()
      .then((r) => setRows(r.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const latestLeave = rows.find((r) => r.leaveSummary)?.leaveSummary;

  return (
    <div className="pp-page">
      <div>
        <h1 className="pp-title"><Receipt size={22} color="var(--primary-400)" /> My payslips</h1>
        <p className="pp-sub">Payslips appear here once payroll is approved. They are also e-mailed to you on salary day.</p>
      </div>

      {latestLeave && (
        <div className="pp-kpis">
          <div className="pp-card"><div className="pp-kpi-label">CL balance</div><div className="pp-kpi-value">{num(latestLeave.cl?.balance)}</div><div className="pp-small">of {num(latestLeave.cl?.allocated)} this FY</div></div>
          <div className="pp-card"><div className="pp-kpi-label">PL balance</div><div className="pp-kpi-value">{num(latestLeave.pl?.balance)}</div><div className="pp-small">of {num(latestLeave.pl?.allocated)} this FY</div></div>
          <div className="pp-card"><div className="pp-kpi-label">Last net pay</div><div className="pp-kpi-value" style={{ color: 'var(--success-text)' }}>{inr(rows[0]?.netSalary)}</div><div className="pp-small">{rows[0] ? `${MONTHS[rows[0].month - 1]} ${rows[0].year}` : ''}</div></div>
          <div className="pp-card"><div className="pp-kpi-label">Payslips</div><div className="pp-kpi-value">{rows.length}</div></div>
        </div>
      )}

      {error && <div className="pp-banner pp-banner-err">{error}</div>}
      {loading && <div className="pp-muted">Loading…</div>}
      {!loading && rows.length === 0 && !error && <div className="pp-card pp-muted" style={{ textAlign: 'center', padding: 32 }}>No payslips yet.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} className="pp-card pp-row">
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{MONTHS[r.month - 1]} {r.year}</div>
              <div className="pp-small">Paid days {num(r.payableDays)}{Number(r.lopDays) > 0 ? ` · ${num(r.lopDays)} LOP` : ''} · Gross {inr(r.grossEarnings)} · Deductions {inr(r.totalDeductions)}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--success-text)' }}>{inr(r.netSalary)}</div>
            <button className="pp-btn" onClick={() => openAuthedFile(`/payroll/payslip/${r.id}/pdf`, `Payslip_${MONTHS[r.month - 1]}_${r.year}.pdf`).catch((e) => setError(e.message))}>
              <Download size={16} /> PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPayslipsPage;
