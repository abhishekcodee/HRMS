import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Lock,
  Mail,
  RefreshCw,
  Settings as SettingsIcon,
  X,
  Zap,
} from 'lucide-react';
import '../styles/payroll.css';
import { MONTHS, PayrollSettings, PayrollSettingsResponse, inr, num, openAuthedFile, payrollRunApi } from '../services/payrollRunApi';

const LOCKED = ['APPROVED', 'PROCESSED', 'PAID'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PT_STATES = ['Maharashtra', 'Karnataka', 'West Bengal', 'Gujarat', 'Telangana', 'Andhra Pradesh', 'Assam', 'Madhya Pradesh', 'Goa',
  'Tamil Nadu', 'Kerala', 'Odisha', 'Bihar', 'Punjab', 'Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Uttarakhand', 'Other'];

function defaultMonth() {
  // Payroll is usually run for the month that just ended
  const d = new Date();
  d.setDate(1);
  if (new Date().getDate() <= 20) d.setMonth(d.getMonth() - 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function parse<T = any>(v: any): T | null {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

function emailBadge(status?: string | null) {
  switch (status) {
    case 'SENT': return <span className="pp-badge pp-badge-green"><Mail size={11} /> Sent</span>;
    case 'DRY_RUN': return <span className="pp-badge pp-badge-amber">Not sent (no SMTP)</span>;
    case 'FAILED': return <span className="pp-badge pp-badge-red">Failed</span>;
    case 'SENDING': return <span className="pp-badge pp-badge-blue">Sending…</span>;
    default: return <span className="pp-badge pp-badge-grey">Not sent</span>;
  }
}

export const PayrollProcessingPage: React.FC = () => {
  const init = defaultMonth();
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const [run, setRun] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [cfg, setCfg] = useState<PayrollSettingsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showReadiness, setShowReadiness] = useState(false);

  const label = `${MONTHS[month - 1]} ${year}`;

  const load = useCallback(async () => {
    setBusy((b) => b || 'load');
    try {
      const [runsRes, readyRes] = await Promise.all([payrollRunApi.runs(), payrollRunApi.readiness(month, year)]);
      setReadiness(readyRes.data);
      const current = (runsRes.data || []).find((r: any) => Number(r.payrollMonth) === month && Number(r.payrollYear) === year);
      if (current) {
        const detailRes = await payrollRunApi.run(current.id);
        setRun({ ...current, ...detailRes.data.run });
        setItems(detailRes.data.items || []);
      } else {
        setRun(null);
        setItems([]);
      }
    } catch (err: any) {
      setNotice({ kind: 'err', text: err.message });
    } finally {
      setBusy((b) => (b === 'load' ? null : b));
    }
  }, [month, year]);

  const loadSettings = useCallback(async () => {
    try {
      setCfg((await payrollRunApi.settings()).data);
    } catch { /* employees can't see settings */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setNotice(null);
  };

  const act = async (key: string, fn: () => Promise<{ message?: string; data?: any }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setNotice(null);
    try {
      const res = await fn();
      const warnings: string[] = res.data?.warnings || [];
      const dry = res.data?.dryRun;
      setNotice({ kind: dry || warnings.length ? 'warn' : 'ok', text: [res.message || 'Done', ...warnings.slice(0, 5)].join(' • ') });
      await load();
    } catch (err: any) {
      setNotice({ kind: 'err', text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const status = String(run?.status || '').toUpperCase();
  const isLocked = LOCKED.includes(status);
  const sentCount = items.filter((i) => i.email_status === 'SENT').length;
  const pendingEmail = items.filter((i) => i.email_status !== 'SENT').length;
  const runWarnings: string[] = parse<string[]>(run?.warnings_json || run?.warningsJson) || [];

  const steps = [
    { label: 'Generate', hint: run ? `${items.length} employees` : 'Not generated', done: !!run },
    { label: 'Review', hint: run ? 'Check LOP & warnings' : '—', done: isLocked },
    { label: 'Approve', hint: isLocked ? status.toLowerCase() : 'Pending', done: isLocked },
    { label: 'E-mail slips', hint: items.length ? `${sentCount}/${items.length} sent` : '—', done: items.length > 0 && sentCount === items.length },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.employee_name} ${i.employee_code} ${i.department || ''}`.toLowerCase().includes(q));
  }, [items, search]);

  const openSlip = (item: any) =>
    openAuthedFile(`/payroll/payslip/${item.id}/pdf`, `Payslip_${item.employee_code}.pdf`).catch((e) => setNotice({ kind: 'err', text: e.message }));

  const auto = cfg?.settings.automation;

  return (
    <div className="pp-page">
      <div className="pp-head">
        <div>
          <h1 className="pp-title"><Calculator size={24} color="var(--primary-400)" /> Payroll</h1>
          <p className="pp-sub">Salary is calculated from attendance, approved CL/PL and holidays. Generate it, check it, approve it, and the payslips are e-mailed.</p>
        </div>
        <div className="pp-row">
          <div className="pp-month" role="group" aria-label="Payroll month">
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <span>{label}</span>
            <button onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
          {cfg && <button className="pp-btn" onClick={() => setSettingsOpen(true)}><SettingsIcon size={16} /> Settings</button>}
        </div>
      </div>

      {cfg && (
        <div className={`pp-banner ${auto?.enabled ? 'pp-banner-info' : 'pp-banner-warn'}`}>
          <Zap size={18} style={{ flex: '0 0 18px', marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            {auto?.enabled ? (
              <>
                <b>Automatic payroll is on.</b> Next salary day: <b>{cfg.schedule.nextSalaryDate}</b> for {cfg.schedule.nextPayPeriod}.
                {' '}A draft is generated {auto.generateDaysBefore} day(s) before, then{' '}
                {auto.requireApproval ? 'payslips are e-mailed once you approve it.' : `it is approved automatically and payslips are e-mailed at ${auto.sendHour}:00.`}
                {cfg.lastTick && <div className="pp-small" style={{ marginTop: 4 }}>Last check: {new Date(cfg.lastTick.at).toLocaleString()} – {cfg.lastTick.detail || cfg.lastTick.action}</div>}
              </>
            ) : (
              <><b>Automatic payroll is off.</b> Turn it on in Settings to generate payroll and e-mail payslips with leave balances on salary day.</>
            )}
            {!cfg.emailConfigured && (
              <div style={{ marginTop: 6 }}>
                <AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> E-mail is not set up on the server yet (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD). Until then payslips are prepared but not delivered.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pp-steps">
        {steps.map((s, i) => (
          <div key={s.label} className={`pp-step ${s.done ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}>
            <div className="pp-step-num">{s.done ? <CheckCircle2 size={14} /> : i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div className="pp-step-label">{s.label}</div>
              <div className="pp-step-hint">{s.hint}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pp-card">
        <div className="pp-row pp-actions">
          {!isLocked && (
            <button className={`pp-btn ${run ? '' : 'pp-btn-primary'}`} disabled={!!busy}
              onClick={() => act('generate', () => payrollRunApi.generate(month, year), run ? `Recalculate ${label}? This replaces the current figures.` : undefined)}>
              <RefreshCw size={16} className={busy === 'generate' ? 'animate-spin' : ''} />
              {run ? 'Recalculate' : `Generate payroll for ${label}`}
            </button>
          )}
          {run && !isLocked && status !== 'CANCELLED' && (
            <button className="pp-btn pp-btn-success" disabled={!!busy}
              onClick={() => act('approve', () => payrollRunApi.setStatus(run.id, 'APPROVED'), `Approve and lock payroll for ${label}? Figures can no longer be recalculated.`)}>
              <Lock size={16} /> Approve &amp; lock
            </button>
          )}
          {run && isLocked && (
            <button className="pp-btn pp-btn-primary" disabled={!!busy || pendingEmail === 0}
              onClick={() => act('email', () => payrollRunApi.sendPayslips(run.id), `E-mail payslips with leave balances to ${pendingEmail} employee(s)?`)}>
              <Mail size={16} /> {pendingEmail === 0 ? 'All payslips sent' : `E-mail payslips (${pendingEmail})`}
            </button>
          )}
          {run && status === 'APPROVED' && (
            <button className="pp-btn" disabled={!!busy} onClick={() => act('paid', () => payrollRunApi.setStatus(run.id, 'PAID'), 'Mark salaries as paid?')}>
              <CheckCircle2 size={16} /> Mark as paid
            </button>
          )}
          <span className="pp-spacer" />
          {run && <span className={`pp-badge ${isLocked ? 'pp-badge-green' : 'pp-badge-blue'}`}>{status}</span>}
          {busy === 'load' && <span className="pp-small">Loading…</span>}
        </div>
        {notice && (
          <div className={`pp-banner pp-banner-${notice.kind}`} style={{ marginTop: 12 }}>
            {notice.kind === 'err' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <div style={{ flex: 1 }}>{notice.text}</div>
            <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}
      </div>

      {readiness && (readiness.errorCount > 0 || readiness.warningCount > 0) && (
        <div className="pp-banner pp-banner-warn">
          <AlertTriangle size={18} style={{ flex: '0 0 18px' }} />
          <div style={{ flex: 1 }}>
            <b>{readiness.errorCount > 0 ? `${readiness.errorCount} employee(s) have no salary set and will be skipped.` : 'Some employee records are incomplete.'}</b>{' '}
            {readiness.warningCount > 0 && `${readiness.warningCount} have warnings (no e-mail, bank, PAN or attendance).`}{' '}
            <button className="pp-btn pp-btn-ghost pp-btn-sm" style={{ padding: 0, minHeight: 0, textDecoration: 'underline' }} onClick={() => setShowReadiness((v) => !v)}>
              {showReadiness ? 'Hide' : 'Show list'}
            </button>
            {showReadiness && (
              <ul>
                {readiness.items.filter((r: any) => r.errors.length || r.warnings.length).slice(0, 50).map((r: any) => (
                  <li key={r.employeeId}><b>{r.fullName}</b> ({r.employeeCode}): {[...r.errors, ...r.warnings].join(', ')}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {runWarnings.length > 0 && (
        <div className="pp-banner pp-banner-warn">
          <AlertTriangle size={18} style={{ flex: '0 0 18px' }} />
          <div><b>Not included in this run:</b><ul>{runWarnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
        </div>
      )}

      {run && (
        <div className="pp-kpis">
          <div className="pp-card"><div className="pp-kpi-label">Employees</div><div className="pp-kpi-value">{items.length}</div></div>
          <div className="pp-card"><div className="pp-kpi-label">Gross pay</div><div className="pp-kpi-value">{inr(run.total_gross ?? run.totalGross)}</div></div>
          <div className="pp-card"><div className="pp-kpi-label">Net pay (to bank)</div><div className="pp-kpi-value" style={{ color: 'var(--success-text)' }}>{inr(run.total_net ?? run.totalNet)}</div></div>
          <div className="pp-card"><div className="pp-kpi-label">Cost to company</div><div className="pp-kpi-value">{inr(run.total_employer_cost ?? run.totalEmployerCost)}</div></div>
        </div>
      )}

      <div className="pp-card">
        <div className="pp-row" style={{ marginBottom: 12 }}>
          <input className="pp-search" placeholder="Search employee, code or department" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="pp-spacer" />
          <span className="pp-muted">{filtered.length} of {items.length}</span>
        </div>

        {!run && busy !== 'load' && (
          <div style={{ textAlign: 'center', padding: '32px 12px' }} className="pp-muted">
            <FileText size={32} style={{ opacity: 0.5 }} />
            <div style={{ marginTop: 8 }}>No payroll for {label} yet. Click <b>Generate payroll</b> to calculate it from attendance and leave.</div>
          </div>
        )}

        {run && (
          <>
            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Employee</th><th>Paid days</th><th className="num">Gross</th><th className="num">PF</th><th className="num">ESIC</th>
                    <th className="num">PT</th><th className="num">TDS</th><th className="num">Other</th><th className="num">Net pay</th><th>Payslip</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const warn = parse<string[]>(it.warnings_json) || [];
                    return (
                      <tr key={it.id}>
                        <td className="emp">
                          <div style={{ fontWeight: 600 }}>{it.employee_name}</div>
                          <div className="pp-small">{it.employee_code}{it.department ? ` · ${it.department}` : ''}</div>
                          {warn.length > 0 && <div className="pp-warn-line" title={warn.join('\n')}><AlertTriangle size={11} /> {warn.length} note{warn.length > 1 ? 's' : ''}: {warn[0]}</div>}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {num(it.payable_days)}/{it.calendar_days}
                          {Number(it.lop_days) > 0 && <span className="pp-badge pp-badge-red" style={{ marginLeft: 6 }}>{num(it.lop_days)} LOP</span>}
                        </td>
                        <td className="num">{inr(it.gross_earnings)}</td>
                        <td className="num">{inr(it.employee_pf)}</td>
                        <td className="num">{inr(it.employee_esic)}</td>
                        <td className="num">{inr(it.professional_tax)}</td>
                        <td className="num">{inr(it.tds)}</td>
                        <td className="num">{inr(Number(it.loan_emi_deduction) + Number(it.other_deductions))}</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--success-text)' }}>{inr(it.net_salary)}</td>
                        <td>{emailBadge(it.email_status)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="pp-btn pp-btn-sm" onClick={() => setDetail(it)}>Details</button>{' '}
                          <button className="pp-btn pp-btn-sm" onClick={() => openSlip(it)} aria-label="Open payslip PDF"><Download size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pp-cards">
              {filtered.map((it) => (
                <div key={it.id} className="pp-emp-card">
                  <div className="pp-emp-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{it.employee_name}</div>
                      <div className="pp-small">{it.employee_code}{it.department ? ` · ${it.department}` : ''}</div>
                    </div>
                    {emailBadge(it.email_status)}
                  </div>
                  <div className="pp-emp-card-grid">
                    <div><span>Paid days</span><b>{num(it.payable_days)}/{it.calendar_days}</b></div>
                    <div><span>LOP</span><b style={{ color: Number(it.lop_days) > 0 ? 'var(--error-text)' : undefined }}>{num(it.lop_days)}</b></div>
                    <div><span>Gross</span><b>{inr(it.gross_earnings)}</b></div>
                    <div><span>Deductions</span><b>{inr(it.total_deductions)}</b></div>
                    <div><span>Net pay</span><b style={{ color: 'var(--success-text)' }}>{inr(it.net_salary)}</b></div>
                  </div>
                  <div className="pp-row" style={{ marginTop: 10 }}>
                    <button className="pp-btn pp-btn-sm" style={{ flex: 1 }} onClick={() => setDetail(it)}>Details</button>
                    <button className="pp-btn pp-btn-sm" style={{ flex: 1 }} onClick={() => openSlip(it)}><Download size={14} /> Payslip</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {detail && <ItemDetail item={detail} onClose={() => setDetail(null)} onOpenSlip={() => openSlip(detail)}
        onResend={isLocked ? () => act('email', () => payrollRunApi.sendPayslips(run.id, { itemIds: [detail.id], resend: true })) : undefined} />}
      {settingsOpen && cfg && (
        <SettingsModal initial={cfg} onClose={() => setSettingsOpen(false)}
          onSaved={(msg) => { setSettingsOpen(false); setNotice({ kind: 'ok', text: msg }); loadSettings(); }} />
      )}
    </div>
  );
};

const ItemDetail: React.FC<{ item: any; onClose: () => void; onOpenSlip: () => void; onResend?: () => void }> = ({ item, onClose, onOpenSlip, onResend }) => {
  const bd = parse<any>(item.calculation_breakdown_json) || {};
  const leave = parse<any>(item.leave_summary_json);
  const a = bd.attendanceSummary || {};
  const codes: string[] = bd.dayCodes || [];
  const formulas: Record<string, string> = bd.formulas || {};
  const warnings: string[] = parse<string[]>(item.warnings_json) || [];

  const earnings: [string, any][] = [
    ['Basic', item.basic_salary], ['HRA', item.hra], ['Conveyance', item.conveyance], ['Medical', item.medical_allowance],
    ['Special allowance', item.special_allowance], ['Overtime', item.overtime_pay], ['Arrears', item.arrears_amount],
    ['Bonus', item.bonus_incentive], ['Reimbursements', item.reimbursements_amount],
  ].filter(([, v]) => Number(v) > 0) as [string, any][];
  const deductions: [string, any][] = [
    ['Provident fund', item.employee_pf], ['ESIC', item.employee_esic], ['Professional tax', item.professional_tax],
    ['Income tax (TDS)', item.tds], ['Loan EMI', item.loan_emi_deduction], ['Other', item.other_deductions],
  ].filter(([, v]) => Number(v) > 0) as [string, any][];

  const codeClass = (c: string) => (['P', 'P*'].includes(c) ? 'P' : c === 'A' ? 'A' : c === 'LWP' ? 'LWP' : c === 'HD' || c === 'MP' ? 'HD' : c === 'H' ? 'H' : c === 'WO' ? 'WO' : c === '-' ? '' : 'L');

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pp-modal-head">
          <div>
            <h3>{item.employee_name}</h3>
            <div className="pp-small">{item.employee_code}{item.designation ? ` · ${item.designation}` : ''}</div>
          </div>
          <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="pp-modal-body">
          {warnings.length > 0 && <div className="pp-banner pp-banner-warn"><AlertTriangle size={16} /><div>{warnings.join(' • ')}</div></div>}
          <div className="pp-kpis">
            <div><div className="pp-kpi-label">Paid days</div><div className="pp-kpi-value">{num(item.payable_days)}</div></div>
            <div><div className="pp-kpi-label">LOP days</div><div className="pp-kpi-value" style={{ color: Number(item.lop_days) ? 'var(--error-text)' : undefined }}>{num(item.lop_days)}</div></div>
            <div><div className="pp-kpi-label">Paid leave</div><div className="pp-kpi-value">{num(item.paid_leave_days)}</div></div>
            <div><div className="pp-kpi-label">Net pay</div><div className="pp-kpi-value" style={{ color: 'var(--success-text)' }}>{inr(item.net_salary)}</div></div>
          </div>

          {codes.length > 0 && (
            <div>
              <p className="pp-section-title">Attendance this month</p>
              <div className="pp-daystrip">
                {codes.map((c, i) => <div key={i} className={`pp-day ${codeClass(c)}`}>{c === '-' ? '·' : c}<small>{i + 1}</small></div>)}
              </div>
              <div className="pp-small" style={{ marginTop: 6 }}>
                Present {num(a.presentDays)} · Leave {num(a.paidLeaveDays)} · Absent/LWP {num(a.absentDays)} · Holidays {num(a.holidays)} · Weekly offs {num(a.weeklyOffs)}
                {a.lateCount ? ` · Late ${a.lateCount}×` : ''}{a.overtimeHours ? ` · OT ${num(a.overtimeHours)} h` : ''}
              </div>
            </div>
          )}

          <div className="pp-split">
            <div>
              <p className="pp-section-title">Earnings</p>
              <table className="pp-lines"><tbody>
                {earnings.map(([k, v]) => <tr key={k}><td>{k}</td><td>{inr(v)}</td></tr>)}
                <tr className="total"><td>Total</td><td>{inr(Number(item.gross_earnings) + Number(item.reimbursements_amount || 0))}</td></tr>
              </tbody></table>
            </div>
            <div>
              <p className="pp-section-title">Deductions</p>
              <table className="pp-lines"><tbody>
                {deductions.length === 0 && <tr><td className="pp-muted">None</td><td></td></tr>}
                {deductions.map(([k, v]) => <tr key={k}><td>{k}</td><td>{inr(v)}</td></tr>)}
                <tr className="total"><td>Total</td><td>{inr(item.total_deductions)}</td></tr>
              </tbody></table>
            </div>
          </div>

          {leave && (
            <div>
              <p className="pp-section-title">Leave balance (FY {leave.financialYear})</p>
              <table className="pp-lines"><tbody>
                {(['cl', 'pl'] as const).map((k) => leave[k] && (
                  <tr key={k}><td>{k === 'cl' ? 'Casual leave (CL)' : 'Privilege leave (PL)'}: entitled {num(leave[k].allocated)}, availed {num(leave[k].used)}, pending {num(leave[k].pending)}</td><td><b>{num(leave[k].balance)} left</b></td></tr>
                ))}
              </tbody></table>
            </div>
          )}

          {Object.keys(formulas).length > 0 && (
            <div>
              <p className="pp-section-title">How it was calculated</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(formulas).map(([k, v]) => <div key={k} className="pp-formula">{v}</div>)}
              </div>
            </div>
          )}
          {item.email_error && <div className="pp-banner pp-banner-err"><AlertTriangle size={16} /><div>Last e-mail error: {item.email_error}</div></div>}
        </div>
        <div className="pp-modal-foot">
          {onResend && <button className="pp-btn" onClick={onResend}><Mail size={16} /> {item.email_status === 'SENT' ? 'Resend payslip' : 'Send payslip'}</button>}
          <button className="pp-btn pp-btn-primary" onClick={onOpenSlip}><Download size={16} /> Payslip PDF</button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<{ initial: PayrollSettingsResponse; onClose: () => void; onSaved: (msg: string) => void }> = ({ initial, onClose, onSaved }) => {
  const [s, setS] = useState<PayrollSettings>(JSON.parse(JSON.stringify(initial.settings)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<PayrollSettings>) => setS((p) => ({ ...p, ...patch }));
  const setAuto = (patch: Partial<PayrollSettings['automation']>) => setS((p) => ({ ...p, automation: { ...p.automation, ...patch } }));
  const ptKnown = PT_STATES.includes(s.ptState);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await payrollRunApi.saveSettings(s);
      onSaved(s.automation.enabled ? `Saved. Payroll will run automatically on day ${s.automation.salaryDay} of every month.` : 'Payroll settings saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pp-modal-head">
          <h3><SettingsIcon size={18} style={{ verticalAlign: '-3px' }} /> Payroll settings</h3>
          <button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="pp-modal-body">
          <section>
            <p className="pp-section-title"><Clock size={13} style={{ verticalAlign: '-2px' }} /> Salary day automation</p>
            <label className="pp-check" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={s.automation.enabled} onChange={(e) => setAuto({ enabled: e.target.checked })} />
              <span><b>Generate payroll and e-mail payslips automatically</b><br /><span className="pp-small">Each employee gets a PDF payslip and their CL/PL balance by e-mail on salary day.</span></span>
            </label>
            <div className="pp-form">
              <div className="pp-field">
                <label>Salary day</label>
                <select value={s.automation.salaryDay} onChange={(e) => setAuto({ salaryDay: Number(e.target.value) })}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d === 31 ? 'Last day of month' : `Day ${d}`}</option>)}
                </select>
              </div>
              <div className="pp-field">
                <label>Salary on that day is for</label>
                <select value={s.automation.payFor} onChange={(e) => setAuto({ payFor: e.target.value as any })}>
                  <option value="PREVIOUS_MONTH">The previous month (e.g. 1 Dec pays November)</option>
                  <option value="CURRENT_MONTH">The same month (e.g. 30 Nov pays November)</option>
                </select>
              </div>
              <div className="pp-field">
                <label>Prepare draft for review</label>
                <select value={s.automation.generateDaysBefore} onChange={(e) => setAuto({ generateDaysBefore: Number(e.target.value) })}>
                  {[0, 1, 2, 3, 4, 5, 7, 10].map((d) => <option key={d} value={d}>{d === 0 ? 'On salary day' : `${d} day(s) before`}</option>)}
                </select>
              </div>
              <div className="pp-field">
                <label>E-mail payslips at</label>
                <select value={s.automation.sendHour} onChange={(e) => setAuto({ sendHour: Number(e.target.value) })}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
                </select>
              </div>
              <div className="pp-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pp-check">
                  <input type="checkbox" checked={s.automation.requireApproval} onChange={(e) => setAuto({ requireApproval: e.target.checked })} />
                  <span>Wait for my approval before e-mailing<br /><span className="pp-small">Off = fully automatic: the draft is approved on salary day. On = you get a reminder and payslips go out when you approve.</span></span>
                </label>
              </div>
              <div className="pp-field">
                <label>Copy every payslip to (optional)</label>
                <input type="email" placeholder="hr@yourcompany.com" value={s.automation.hrCcEmail} onChange={(e) => setAuto({ hrCcEmail: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <p className="pp-section-title">Attendance rules</p>
            <div className="pp-form">
              <div className="pp-field">
                <label>Weekly off</label>
                <div className="pp-chips">
                  {WEEKDAYS.map((w, i) => (
                    <button type="button" key={w} className={`pp-chip ${s.weeklyOffs.includes(i) ? 'on' : ''}`}
                      onClick={() => set({ weeklyOffs: s.weeklyOffs.includes(i) ? s.weeklyOffs.filter((x) => x !== i) : [...s.weeklyOffs, i].sort() })}>{w}</button>
                  ))}
                </div>
                <label className="pp-check" style={{ marginTop: 6 }}>
                  <input type="checkbox" checked={s.secondFourthSaturdayOff} onChange={(e) => set({ secondFourthSaturdayOff: e.target.checked })} />
                  <span>2nd and 4th Saturday off</span>
                </label>
              </div>
              <div className="pp-field">
                <label>Salary divided by</label>
                <select value={s.payableDaysPolicy} onChange={(e) => set({ payableDaysPolicy: e.target.value as any })}>
                  <option value="CALENDAR_DAYS">Days in the month (28–31)</option>
                  <option value="FIXED_30">Always 30 days</option>
                  <option value="FIXED_26">Always 26 days</option>
                  <option value="WORKING_DAYS">Working days only</option>
                </select>
                <small>One day's pay = monthly salary ÷ this number. Each LOP day removes one day's pay.</small>
              </div>
              <div className="pp-field">
                <label>A working day with no punch and no approved leave is</label>
                <select value={s.missingAttendanceRule} onChange={(e) => set({ missingAttendanceRule: e.target.value as any })}>
                  <option value="ABSENT">Absent (loss of pay) – recommended with biometric</option>
                  <option value="PRESENT">Present – only marked absences deduct pay</option>
                </select>
              </div>
              <div className="pp-field">
                <label>A day with only one punch (missed punch) is</label>
                <select value={s.missedPunchRule || 'HALF_DAY'} onChange={(e) => set({ missedPunchRule: e.target.value as any })}>
                  <option value="HALF_DAY">Half day until corrected – recommended</option>
                  <option value="ABSENT">Absent until corrected</option>
                  <option value="PRESENT">Present (paid in full)</option>
                </select>
                <small>Employees can request a correction from their attendance calendar; HR approves it.</small>
              </div>
              <div className="pp-field">
                <label>Late marks</label>
                <select value={s.lateMarksPerHalfDay} onChange={(e) => set({ lateMarksPerHalfDay: Number(e.target.value) })}>
                  <option value={0}>No deduction for late coming</option>
                  {[2, 3, 4, 5].map((n) => <option key={n} value={n}>Every {n} late marks = ½ day LOP</option>)}
                </select>
              </div>
              <div className="pp-field">
                <label className="pp-check">
                  <input type="checkbox" checked={s.overtimeEnabled} onChange={(e) => set({ overtimeEnabled: e.target.checked })} />
                  <span>Pay overtime from biometric hours</span>
                </label>
                {s.overtimeEnabled && (
                  <select value={s.overtimeMultiplier} onChange={(e) => set({ overtimeMultiplier: Number(e.target.value) })}>
                    {[1, 1.5, 2].map((m) => <option key={m} value={m}>{m}× hourly basic {m === 2 ? '(Factories Act)' : ''}</option>)}
                  </select>
                )}
              </div>
            </div>
          </section>

          <section>
            <p className="pp-section-title">Salary structure &amp; statutory</p>
            <div className="pp-form">
              <div className="pp-field">
                <label>Basic = % of monthly gross</label>
                <input type="number" min={10} max={100} value={s.basicPercent} onChange={(e) => set({ basicPercent: Number(e.target.value) })} />
                <small>New Labour Codes: keep basic at 50% or more, otherwise PF is charged on the excess anyway.</small>
              </div>
              <div className="pp-field">
                <label>HRA = % of basic</label>
                <input type="number" min={0} max={100} value={s.hraPercentOfBasic} onChange={(e) => set({ hraPercentOfBasic: Number(e.target.value) })} />
                <small>40% (non-metro) or 50% (metro). The rest of the salary is Special Allowance.</small>
              </div>
              <div className="pp-field">
                <label>Professional tax state</label>
                <select value={ptKnown ? s.ptState : 'Other'} onChange={(e) => set({ ptState: e.target.value === 'Other' ? '' : e.target.value })}>
                  {PT_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
                {!ptKnown && <input placeholder="State name" value={s.ptState} onChange={(e) => set({ ptState: e.target.value })} />}
                <small>Built-in slabs for most states. For Tamil Nadu, Kerala and others add slabs under Payroll → Statutory.</small>
              </div>
              <div className="pp-field">
                <label className="pp-check">
                  <input type="checkbox" checked={s.pf.enabled} onChange={(e) => set({ pf: { ...s.pf, enabled: e.target.checked } })} />
                  <span>Provident Fund (12%)</span>
                </label>
                <label className="pp-check">
                  <input type="checkbox" checked={s.pf.restrictToCeiling} disabled={!s.pf.enabled} onChange={(e) => set({ pf: { ...s.pf, restrictToCeiling: e.target.checked } })} />
                  <span>Limit PF to wages of ₹{s.pf.ceiling.toLocaleString('en-IN')} (max ₹1,800)</span>
                </label>
                <label className="pp-check">
                  <input type="checkbox" checked={s.esic.enabled} onChange={(e) => set({ esic: { ...s.esic, enabled: e.target.checked } })} />
                  <span>ESIC for salaries up to ₹{s.esic.threshold.toLocaleString('en-IN')} (0.75% / 3.25%)</span>
                </label>
              </div>
            </div>
          </section>
          {error && <div className="pp-banner pp-banner-err"><AlertTriangle size={16} /><div>{error}</div></div>}
        </div>
        <div className="pp-modal-foot">
          <button className="pp-btn" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessingPage;
