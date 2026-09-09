import { UserRole, EmployeeMock, NotificationMock } from '@hrms/shared';

// Base API URL pointing to HRMS Express Backend
const BASE_URL = 'http://localhost:3000/api/v1';

export async function fetchMobileEmployees(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/employees`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.log('[Mobile API] Error fetching employees:', err);
    return [];
  }
}

export async function fetchMobileLeaveRequests(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/leave?view=admin`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.log('[Mobile API] Error fetching leave requests:', err);
    return [];
  }
}

export async function fetchMobileLeaveBalances(): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/leave/balances`);
    const json = await res.json();
    if (json.success && json.summary) {
      return {
        casual: { allocated: json.summary.cl.allocated, used: json.summary.cl.used, remaining: json.summary.cl.remaining },
        privilege: { allocated: json.summary.pl.allocated, used: json.summary.pl.used, remaining: json.summary.pl.remaining },
      };
    }
    if (json.success && Array.isArray(json.data)) {
      const cl = json.data.find((b: any) => b.leaveType === 'CL' || b.leaveType === 'Casual Leave') || {};
      const pl = json.data.find((b: any) => b.leaveType === 'PL' || b.leaveType === 'Privilege Leave') || {};
      return {
        casual: {
          allocated: cl.allocated !== undefined ? cl.allocated : (cl.allocatedDays !== undefined ? cl.allocatedDays : 0),
          used: cl.used !== undefined ? cl.used : (cl.usedDays !== undefined ? cl.usedDays : 0),
          remaining: cl.remaining !== undefined ? cl.remaining : (cl.remainingDays !== undefined ? cl.remainingDays : 0),
        },
        privilege: {
          allocated: pl.allocated !== undefined ? pl.allocated : (pl.allocatedDays !== undefined ? pl.allocatedDays : 0),
          used: pl.used !== undefined ? pl.used : (pl.usedDays !== undefined ? pl.usedDays : 0),
          remaining: pl.remaining !== undefined ? pl.remaining : (pl.remainingDays !== undefined ? pl.remainingDays : 0),
        },
      };
    }
    return { casual: { allocated: 10, used: 0, remaining: 10 }, privilege: { allocated: 14, used: 0, remaining: 14 } };
  } catch (err) {
    console.log('[Mobile API] Error fetching leave balances:', err);
    return { casual: { allocated: 10, used: 0, remaining: 10 }, privilege: { allocated: 14, used: 0, remaining: 14 } };
  }
}

export async function applyMobileLeave(payload: {
  employeeId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/leave/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error applying leave.' };
  }
}

export async function handleMobileLeaveAction(
  id: string,
  action: 'APPROVE' | 'REJECT',
  comments?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/leave/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comments: comments || `Mobile Quick Action: ${action}` }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error performing leave action.' };
  }
}

export async function fetchMobileBiometricPunches(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/zkteco/raw-logs`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.log('[Mobile API] Error fetching biometric logs:', err);
    return [];
  }
}

export async function fetchMobileNotifications(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/notifications`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.log('[Mobile API] Error fetching notifications:', err);
    return [];
  }
}

export async function markMobileNotificationRead(id?: string): Promise<boolean> {
  try {
    const url = id ? `${BASE_URL}/notifications/${id}/read` : `${BASE_URL}/notifications/read-all`;
    const res = await fetch(url, { method: 'POST' });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    return false;
  }
}

export async function clearAllMobileNotifications(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/notifications/all`, { method: 'DELETE' });
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    return false;
  }
}
