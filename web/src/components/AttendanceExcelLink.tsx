import React, { useEffect, useState } from 'react';
import { Copy, Download, FileSpreadsheet, Link2, RefreshCw, Trash2 } from 'lucide-react';
import '../styles/payroll.css';
import { absoluteApiBase, openAuthedFile, payrollRunApi } from '../services/payrollRunApi';

type Period = 'current' | 'previous';

/** Admin card: one permanent link that always returns up-to-date attendance as an Excel file. */
export const AttendanceExcelLink: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('current');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    payrollRunApi.feedLink().then((r) => { setToken(r.data?.token || null); setLastUsed(r.data?.lastUsedAt || null); }).catch(() => undefined);
  }, []);

  const base = token ? `${absoluteApiBase()}/attendance-feed/${token}` : '';
  const qs = period === 'previous' ? '?month=previous' : '';
  const xlsxUrl = token ? `${base}.xlsx${qs}` : '';
  const csvUrl = token ? `${base}.csv${qs}` : '';

  const create = async (confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const r = await payrollRunApi.createFeedLink();
      setToken(r.data.token);
      setLastUsed(null);
      setMsg(r.message || 'Link created');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm('Turn off the Excel link? Spreadsheets using it will stop updating.')) return;
    setBusy(true);
    try {
      await payrollRunApi.revokeFeedLink();
      setToken(null);
      setMsg('Link turned off.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Link copied.');
    } catch {
      setMsg('Copy failed. Select the link and copy it manually.');
    }
  };

  return (
    <div className="pp-card">
      <div className="pp-row" style={{ alignItems: 'flex-start' }}>
        <FileSpreadsheet size={22} color="#16a34a" style={{ flex: '0 0 22px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Live attendance in Excel</div>
          <div className="pp-muted" style={{ marginTop: 2 }}>
            One link that always gives the latest attendance: summary, daily register (P/A/CL/PL/H/WO), in-out times, LOP and payable days.
            It uses the same rules as payroll, so the numbers match.
          </div>
        </div>
      </div>

      {!token ? (
        <div className="pp-row" style={{ marginTop: 12 }}>
          <button className="pp-btn pp-btn-primary" disabled={busy} onClick={() => create()}><Link2 size={16} /> Create Excel link</button>
          <button className="pp-btn" onClick={() => openAuthedFile('/attendance/export.xlsx', 'Attendance.xlsx', 'download').catch((e) => setMsg(e.message))}>
            <Download size={16} /> Download this month
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="pp-chips">
            <button className={`pp-chip ${period === 'current' ? 'on' : ''}`} onClick={() => setPeriod('current')}>Always this month</button>
            <button className={`pp-chip ${period === 'previous' ? 'on' : ''}`} onClick={() => setPeriod('previous')}>Always last month</button>
          </div>
          <div className="pp-copy">
            <input readOnly value={xlsxUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Excel link" />
            <button className="pp-btn pp-btn-primary" onClick={() => copy(xlsxUrl)}><Copy size={16} /> Copy link</button>
          </div>
          <div className="pp-row">
            <a className="pp-btn" href={xlsxUrl}><Download size={16} /> Download now</a>
            <button className="pp-btn" onClick={() => setShowHelp((v) => !v)}>{showHelp ? 'Hide steps' : 'How to use in Excel / Google Sheets'}</button>
            <span className="pp-spacer" />
            <button className="pp-btn pp-btn-sm" disabled={busy} onClick={() => create('Create a new link? The current link will stop working.')}><RefreshCw size={14} /> New link</button>
            <button className="pp-btn pp-btn-sm" disabled={busy} onClick={revoke}><Trash2 size={14} /> Turn off</button>
          </div>
          {lastUsed && <div className="pp-small">Last opened {new Date(lastUsed).toLocaleString()}</div>}
          {showHelp && (
            <div className="pp-banner pp-banner-info" style={{ display: 'block' }}>
              <b>Excel (auto-updating)</b>
              <ol className="pp-steps-list">
                <li>Open Excel → <b>Data</b> → <b>Get Data</b> → <b>From Other Sources</b> → <b>From Web</b>.</li>
                <li>Paste the link above and click <b>OK</b>, then choose the <b>Summary</b> (or <b>Daily register</b>) sheet → <b>Load</b>.</li>
                <li>Click <b>Refresh All</b> any time for the latest punches. To refresh automatically: <b>Data → Queries &amp; Connections</b> → right-click the query → <b>Properties</b> → tick <i>Refresh every 30 minutes</i> and <i>Refresh data when opening the file</i>.</li>
              </ol>
              <b>Google Sheets</b>
              <ol className="pp-steps-list">
                <li>In any cell type: <code style={{ wordBreak: 'break-all' }}>=IMPORTDATA("{csvUrl}")</code></li>
                <li>Daily register: <code style={{ wordBreak: 'break-all' }}>=IMPORTDATA("{`${csvUrl}${qs ? '&' : '?'}sheet=daily`}")</code></li>
              </ol>
              <div className="pp-small">Anyone with the link can see attendance. Share it only with people who should, and use <b>New link</b> if it leaks.</div>
            </div>
          )}
        </div>
      )}
      {msg && <div className="pp-small" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
};

export default AttendanceExcelLink;
