import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import '../styles/payroll.css';
import { API_BASE_URL, getAuthHeaders } from '../config/api';
import { MONTHS } from '../services/payrollRunApi';

async function api<T = any>(path: string, init: RequestInit = {}): Promise<{ data: T; message?: string }> {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return { data: json.data, message: json.message };
}

const KIND_CLASS: Record<string, string> = { PRESENT: 'P', PROJECTED: 'P', HALF_DAY: 'HD', LOP: 'A', HOLIDAY: 'H', WEEK_OFF: 'WO', PAID_LEAVE: 'L' };
const today = () => new Date().toISOString().slice(0, 10);

interface Day { date: string; kind: string; code: string; detail: string | null; lop: number; clockIn: string | null; clockOut: string | null; holiday: string | null }

/** Employee: month calendar (same rules as payroll) + request a correction for a missed punch / absent day. */
export const MyAttendanceCalendar: React.FC = () => {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [days, setDays] = useState<Day[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [fixing, setFixing] = useState<Day | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [cal, regs] = await Promise.all([
        api<{ days: Day[] }>(`/attendance/calendar?month=${ym.y}-${ym.m}`),
        api<any[]>('/attendance/regularizations'),
      ]);
      setDays(cal.data.days || []);
      setRequests(regs.data || []);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
  }, [ym]);
  useEffect(() => { load(); }, [load]);

  const shift = (d: number) => { const t = new Date(ym.y, ym.m - 1 + d, 1); setYm({ y: t.getFullYear(), m: t.getMonth() + 1 }); };
  const lop = days.reduce((a, d) => a + (d.lop || 0), 0);
  const pendingFor = (date: string) => requests.find((r) => r.workDate === date && r.status === 'PENDING');

  return (
    <div className="pp-card">
      <div className="pp-row" style={{ marginBottom: 12 }}>
        <CalendarCheck2 size={20} color="var(--primary-400)" />
        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>My attendance</div>
        <span className="pp-spacer" />
        <div className="pp-month" style={{ width: 'auto' }}>
          <button onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <span style={{ minWidth: 120 }}>{MONTHS[ym.m - 1]} {ym.y}</span>
          <button onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="pp-small" style={{ marginBottom: 8 }}>
        Loss-of-pay days this month: <b style={{ color: lop ? 'var(--error-text)' : undefined }}>{lop}</b>. Tap a red or amber day to ask HR to correct it.
      </div>
      <div className="pp-daystrip">
        {days.map((d) => {
          const canFix = d.date <= today() && (d.kind === 'LOP' || (d.kind === 'HALF_DAY' && d.lop > 0)) && !pendingFor(d.date);
          return (
            <button
              key={d.date}
              type="button"
              className={`pp-day ${KIND_CLASS[d.kind] || ''}`}
              style={{ border: 'none', cursor: canFix ? 'pointer' : 'default', outline: pendingFor(d.date) ? '2px dashed var(--warning-text)' : undefined }}
              title={[d.date, d.detail, d.holiday, d.clockIn ? `${d.clockIn}–${d.clockOut || '?'}` : ''].filter(Boolean).join(' · ')}
              onClick={() => canFix && setFixing(d)}
            >
              {d.code === '-' ? '·' : d.code}
              <small>{Number(d.date.slice(8))}</small>
            </button>
          );
        })}
      </div>
      <div className="pp-small" style={{ marginTop: 8 }}>P present · HD half day · MP missed punch · A absent · CL/PL/SL leave · H holiday · WO weekly off · dashed = correction pending</div>
      {requests.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p className="pp-section-title">My correction requests</p>
          {requests.slice(0, 6).map((r) => (
            <div key={r.id} className="pp-small" style={{ padding: '4px 0' }}>
              {r.workDate} · {r.clockIn}–{r.clockOut} · <b>{r.status}</b>{r.reviewNote ? ` · ${r.reviewNote}` : ''}
            </div>
          ))}
        </div>
      )}
      {msg && <div className={`pp-banner ${msg.ok ? 'pp-banner-ok' : 'pp-banner-err'}`} style={{ marginTop: 12 }}>{msg.text}</div>}
      {fixing && <CorrectionForm day={fixing} onClose={() => setFixing(null)} onDone={(t) => { setFixing(null); setMsg({ ok: true, text: t }); load(); }} />}
    </div>
  );
};

const CorrectionForm: React.FC<{ day: Day; onClose: () => void; onDone: (msg: string) => void }> = ({ day, onClose, onDone }) => {
  const [clockIn, setClockIn] = useState(day.clockIn?.slice(0, 5) || '09:30');
  const [clockOut, setClockOut] = useState(day.clockOut?.slice(0, 5) || '18:30');
  const [requestedStatus, setStatus] = useState('PRESENT');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api('/attendance/regularizations', { method: 'POST', body: JSON.stringify({ workDate: day.date, clockIn, clockOut, requestedStatus, reason }) });
      onDone(r.message || 'Sent to HR.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pp-modal-head"><h3>Correct {day.date}</h3><button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="pp-modal-body">
          <div className="pp-small">Recorded: {day.detail || day.kind}{day.clockIn ? ` (${day.clockIn}–${day.clockOut || 'no out-punch'})` : ''}</div>
          <div className="pp-form">
            <div className="pp-field"><label>In time</label><input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} /></div>
            <div className="pp-field"><label>Out time</label><input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} /></div>
          </div>
          <div className="pp-field"><label>I was</label>
            <select value={requestedStatus} onChange={(e) => setStatus(e.target.value)}>
              <option value="PRESENT">In office (forgot to punch)</option>
              <option value="ON_DUTY">On official duty outside</option>
              <option value="WORK_FROM_HOME">Working from home</option>
              <option value="HALF_DAY">Present for half the day</option>
            </select>
          </div>
          <div className="pp-field"><label>Reason for HR</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Device did not read my face at 6 pm" /></div>
          {err && <div className="pp-banner pp-banner-err">{err}</div>}
        </div>
        <div className="pp-modal-foot"><button className="pp-btn" onClick={onClose}>Cancel</button><button className="pp-btn pp-btn-primary" disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send to HR'}</button></div>
      </div>
    </div>
  );
};

/** HR: review employees' correction requests and correct any day directly. */
export const HrAttendanceCorrections: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<any[]>('/attendance/regularizations?status=PENDING')).data || []); } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const note = action === 'REJECT' ? window.prompt('Reason for rejecting (shown to the employee):') || '' : '';
    try {
      const r = await api(`/attendance/regularizations/${id}`, { method: 'PATCH', body: JSON.stringify({ action, note }) });
      setMsg({ ok: true, text: r.message || 'Done' });
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  };

  return (
    <div className="pp-card">
      <div className="pp-row" style={{ marginBottom: 8 }}>
        <CalendarCheck2 size={20} color="var(--primary-400)" />
        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Attendance corrections {rows.length ? <span className="pp-badge pp-badge-amber">{rows.length} pending</span> : null}</div>
        <span className="pp-spacer" />
        <button className="pp-btn pp-btn-sm" onClick={() => setEditOpen(true)}><Pencil size={14} /> Correct a day</button>
      </div>
      {rows.length === 0 ? (
        <div className="pp-small">No correction requests waiting. Employees can ask for a correction from their attendance calendar.</div>
      ) : rows.map((r) => (
        <div key={r.id} className="pp-row" style={{ padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.employeeName} <span className="pp-small">{r.employeeCode}</span></div>
            <div className="pp-small">{r.workDate} · {r.clockIn}–{r.clockOut} · {String(r.requestedStatus).replace(/_/g, ' ').toLowerCase()} · “{r.reason}”</div>
          </div>
          <button className="pp-btn pp-btn-sm pp-btn-success" onClick={() => review(r.id, 'APPROVE')}>Approve</button>
          <button className="pp-btn pp-btn-sm" onClick={() => review(r.id, 'REJECT')}>Reject</button>
        </div>
      ))}
      {msg && <div className={`pp-banner ${msg.ok ? 'pp-banner-ok' : 'pp-banner-err'}`} style={{ marginTop: 10 }}>{msg.text}</div>}
      {editOpen && <ManualEdit onClose={() => setEditOpen(false)} onDone={(t) => { setEditOpen(false); setMsg({ ok: true, text: t }); }} />}
    </div>
  );
};

const ManualEdit: React.FC<{ onClose: () => void; onDone: (msg: string) => void }> = ({ onClose, onDone }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [f, setF] = useState({ userId: '', workDate: today(), status: 'PRESENT', clockIn: '09:30', clockOut: '18:30', note: '' });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<any[]>('/employees?status=active').then((r) => setEmployees((r.data || []).filter((e: any) => String(e.status).toLowerCase() === 'active'))).catch(() => undefined);
  }, []);
  const timesNeeded = ['PRESENT', 'LATE', 'HALF_DAY', 'ON_DUTY', 'WORK_FROM_HOME'].includes(f.status);
  const save = async () => {
    setErr(null);
    try {
      const body = { ...f, clockIn: timesNeeded ? f.clockIn : null, clockOut: timesNeeded ? f.clockOut : null };
      const r = await api('/attendance/manual', { method: 'PUT', body: JSON.stringify(body) });
      onDone(r.message || 'Saved');
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pp-modal-head"><h3>Correct attendance</h3><button className="pp-btn pp-btn-ghost pp-btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="pp-modal-body">
          <div className="pp-field"><label>Employee</label>
            <select value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}>
              <option value="">Choose…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeId})</option>)}
            </select>
          </div>
          <div className="pp-form">
            <div className="pp-field"><label>Date</label><input type="date" value={f.workDate} max={today()} onChange={(e) => setF({ ...f, workDate: e.target.value })} /></div>
            <div className="pp-field"><label>Mark as</label>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_DUTY', 'WORK_FROM_HOME', 'HOLIDAY', 'WEEK_OFF'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>)}
              </select>
            </div>
            {timesNeeded && <div className="pp-field"><label>In</label><input type="time" value={f.clockIn} onChange={(e) => setF({ ...f, clockIn: e.target.value })} /></div>}
            {timesNeeded && <div className="pp-field"><label>Out</label><input type="time" value={f.clockOut} onChange={(e) => setF({ ...f, clockOut: e.target.value })} /></div>}
          </div>
          <div className="pp-field"><label>Note (kept in the audit log)</label><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <div className="pp-small">Biometric punches arriving later will not overwrite a manual correction.</div>
          {err && <div className="pp-banner pp-banner-err">{err}</div>}
        </div>
        <div className="pp-modal-foot"><button className="pp-btn" onClick={onClose}>Cancel</button><button className="pp-btn pp-btn-primary" disabled={!f.userId} onClick={save}>Save</button></div>
      </div>
    </div>
  );
};
