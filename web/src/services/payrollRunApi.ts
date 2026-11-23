import { API_BASE_URL, getAuthHeaders } from '../config/api';

export interface PayrollSettings {
  payableDaysPolicy: 'CALENDAR_DAYS' | 'FIXED_30' | 'FIXED_26' | 'WORKING_DAYS';
  weeklyOffs: number[];
  secondFourthSaturdayOff: boolean;
  missingAttendanceRule: 'ABSENT' | 'PRESENT';
  basicPercent: number;
  hraPercentOfBasic: number;
  overtimeEnabled: boolean;
  overtimeMultiplier: number;
  lateMarksPerHalfDay: number;
  ptState: string;
  pf: { enabled: boolean; employeeRate: number; epsRate: number; ceiling: number; restrictToCeiling: boolean; edliRate: number; adminRate: number };
  esic: { enabled: boolean; threshold: number; employeeRate: number; employerRate: number };
  automation: {
    enabled: boolean;
    salaryDay: number;
    payFor: 'PREVIOUS_MONTH' | 'CURRENT_MONTH';
    generateDaysBefore: number;
    sendHour: number;
    requireApproval: boolean;
    utcOffsetMinutes: number;
    hrCcEmail: string;
  };
}

export interface PayrollSettingsResponse {
  settings: PayrollSettings;
  emailConfigured: boolean;
  cronKeyConfigured: boolean;
  schedule: { today: string; inWindow: boolean; nextSalaryDate: string; nextPayPeriod: string };
  lastTick: { at: string; action: string; detail?: string } | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function handleAuth(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('hrms_token');
    window.location.href = '/login';
  }
}

async function call<T = any>(path: string, init: RequestInit = {}): Promise<{ data: T; message?: string }> {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } });
  handleAuth(res);
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.message || `Request failed (${res.status})`);
  return { data: json.data as T, message: json.message };
}

export const payrollRunApi = {
  settings: () => call<PayrollSettingsResponse>('/payroll/settings'),
  saveSettings: (settings: PayrollSettings) => call<{ settings: PayrollSettings }>('/payroll/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  runs: () => call<any[]>('/payroll/runs'),
  run: (id: string) => call<{ run: any; items: any[] }>(`/payroll/runs/${id}`),
  readiness: (month: number, year: number) => call<any>(`/payroll/validate-readiness?month=${month}&year=${year}`),
  generate: (month: number, year: number) => call<any>('/payroll/calculate', { method: 'POST', body: JSON.stringify({ month, year }) }),
  setStatus: (id: string, status: string) => call<any>(`/payroll/runs/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  sendPayslips: (id: string, opts: { itemIds?: string[]; resend?: boolean } = {}) => call<any>(`/payroll/runs/${id}/send-payslips`, { method: 'POST', body: JSON.stringify(opts) }),
  runAutomationNow: () => call<any>('/payroll/automation/run-now', { method: 'POST', body: '{}' }),
  myPayslips: () => call<any[]>('/payroll/my-payslips'),
  feedLink: () => call<{ token: string; createdAt: string; lastUsedAt: string | null } | null>('/attendance/feed-link'),
  createFeedLink: () => call<{ token: string }>('/attendance/feed-link', { method: 'POST', body: '{}' }),
  revokeFeedLink: () => call<any>('/attendance/feed-link', { method: 'DELETE' }),
};

/** Absolute URL of the API (for links that are opened outside the app, e.g. in Excel). */
export function absoluteApiBase(): string {
  if (/^https?:\/\//.test(API_BASE_URL)) return API_BASE_URL;
  return `${window.location.origin}${API_BASE_URL}`;
}

/** Fetch an authenticated file and open or save it. A window is opened synchronously so mobile browsers don't block it. */
export async function openAuthedFile(path: string, fileName: string, mode: 'open' | 'download' = 'open') {
  const win = mode === 'open' ? window.open('', '_blank') : null;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { headers: getAuthHeaders() });
    handleAuth(res);
    if (!res.ok) {
      let msg = `Could not load the file (${res.status})`;
      try { const j = await res.json(); msg = j?.error?.message || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    win?.close();
    throw err;
  }
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const inr = (v: any) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
export const num = (v: any) => { const x = Number(v) || 0; return Number.isInteger(x) ? String(x) : x.toFixed(1); };
