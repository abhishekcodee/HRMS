import { API_BASE_URL, getAuthHeaders } from '../config/api';

const BASE = `${API_BASE_URL}/zkteco`;

export interface BiometricDeviceRecord {
  id: string;
  deviceSn: string;
  deviceName: string;
  ipAddress?: string;
  port?: number;
  location?: string;
  status: 'ONLINE' | 'OFFLINE';
  registered: boolean;
  firmware?: string | null;
  userCount?: number | null;
  attCount?: number | null;
  punchCount?: number;
  unmatchedCount?: number;
  lastPingAt?: string;
  lastPunchAt?: string;
  createdAt: string;
}

export interface BiometricPunchLogRecord {
  id: string;
  deviceSn: string;
  /** HRMS employee code when matched, otherwise the device User ID (PIN). */
  employeeId: string;
  devicePin: string;
  userId?: string | null;
  employeeName?: string | null;
  /** Device local time `YYYY-MM-DD HH:MM:SS`. */
  punchTime: string;
  verifyType?: string;
  punchState?: string;
  punchType?: string;
  matched: boolean;
  createdAt: string;
}

export interface PinMappingRecord {
  pin: string;
  deviceName: string | null;
  punches: number;
  unmatched: number;
  lastSeen: string | null;
  userId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  explicit: boolean;
}

export interface MappingEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  biometricPin: string | null;
}

export interface AdmsServerInfo {
  host: string;
  port: number;
  https: boolean;
  isDomain: boolean;
  handshakeUrl: string;
}

type Result = { success: boolean; message?: string; error?: string };

async function call<T = any>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; json: any; data?: T }> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } });
  let json: any = {};
  try {
    json = await res.json();
  } catch (_) {
    /* non-JSON error page */
  }
  return { ok: res.ok && json.success !== false, json, data: json.data };
}

async function mutate(path: string, method: string, body?: unknown, fallbackError = 'Request failed.'): Promise<Result> {
  try {
    const { ok, json } = await call(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    return ok ? { success: true, message: json.message } : { success: false, error: json.error?.message || fallbackError };
  } catch (err: any) {
    return { success: false, error: err?.message || fallbackError };
  }
}

export async function fetchBiometricDevices(): Promise<BiometricDeviceRecord[]> {
  try {
    const { ok, data } = await call<BiometricDeviceRecord[]>('/devices');
    return ok && Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Fetch biometric devices error:', err);
    return [];
  }
}

export async function fetchAdmsServerInfo(): Promise<AdmsServerInfo | null> {
  try {
    const { ok, data } = await call<AdmsServerInfo>('/server-info');
    return ok && data ? data : null;
  } catch (_) {
    return null;
  }
}

export function registerBiometricDevice(data: {
  deviceSn: string;
  deviceName: string;
  ipAddress?: string;
  port?: number;
  location?: string;
}): Promise<Result> {
  return mutate('/devices', 'POST', data, 'Failed to register eSSL device.');
}

export async function fetchRawBiometricLogs(params: { date?: string; unmatched?: boolean; limit?: number } = {}): Promise<BiometricPunchLogRecord[]> {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.unmatched) q.set('unmatched', '1');
  if (params.limit) q.set('limit', String(params.limit));
  const { ok, data, json } = await call<BiometricPunchLogRecord[]>(`/raw-logs${q.toString() ? `?${q}` : ''}`);
  if (!ok) throw new Error(json?.error?.message || 'Failed to load punch logs.');
  return Array.isArray(data) ? data : [];
}

export async function fetchPinMappings(): Promise<{ pins: PinMappingRecord[]; employees: MappingEmployee[] }> {
  const { ok, data, json } = await call<{ pins: PinMappingRecord[]; employees: MappingEmployee[] }>('/pin-mappings');
  if (!ok || !data) throw new Error(json?.error?.message || 'Failed to load PIN mappings.');
  return data;
}

export function savePinMapping(userId: string, biometricPin: string): Promise<Result> {
  return mutate('/pin-mappings', 'PUT', { userId, biometricPin }, 'Failed to save mapping.');
}

export function queueDeviceCommand(
  deviceId: string,
  type: 'SYNC_ATTLOG' | 'SYNC_USERS' | 'INFO' | 'REBOOT',
  range?: { from?: string; to?: string }
): Promise<Result> {
  return mutate(`/devices/${deviceId}/commands`, 'POST', { type, ...(range || {}) }, 'Failed to queue command.');
}

export function reprocessPunches(): Promise<Result> {
  return mutate('/reprocess', 'POST', {}, 'Failed to reprocess punches.');
}

export function simulateBiometricPunch(data: { employeeId: string; deviceSn?: string; verifyType?: string }): Promise<Result> {
  return mutate('/simulate-punch', 'POST', data, 'Failed to record test punch.');
}

export async function testBiometricDeviceConnection(data: {
  ipAddress: string;
  port?: number;
  deviceSn?: string;
}): Promise<{ success: boolean; status: 'ONLINE' | 'OFFLINE'; latencyMs?: number; message?: string }> {
  try {
    const { json } = await call('/test-connection', { method: 'POST', body: JSON.stringify(data) });
    return {
      success: !!json.success,
      status: json.status || 'OFFLINE',
      latencyMs: json.latencyMs,
      message: json.message || json.error?.message || (json.success ? 'Device reachable.' : 'Device not reachable.'),
    };
  } catch (err: any) {
    return { success: false, status: 'OFFLINE', message: err.message || 'Network error testing device connection.' };
  }
}

export function deleteBiometricDevice(id: string): Promise<Result> {
  return mutate(`/devices/${id}`, 'DELETE', undefined, 'Failed to remove biometric device.');
}

/** Format a device-local `YYYY-MM-DD HH:MM:SS` string for display without timezone conversion. */
export function formatDeviceTime(value?: string | null): string {
  if (!value) return '—';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return String(value);
  const [, y, mo, d, h, mi] = m;
  const hour = Number(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${d}-${mo}-${y} ${String(h12).padStart(2, '0')}:${mi} ${suffix}`;
}
