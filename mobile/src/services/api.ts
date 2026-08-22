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
    if (json.success && json.data) {
      return json.data;
    }
    return { casual: { allocated: 12, used: 2, remaining: 10 }, privilege: { allocated: 15, used: 3, remaining: 12 }, sick: { allocated: 7, used: 1, remaining: 6 } };
  } catch (err) {
    console.log('[Mobile API] Error fetching leave balances:', err);
    return { casual: { allocated: 12, used: 2, remaining: 10 }, privilege: { allocated: 15, used: 3, remaining: 12 }, sick: { allocated: 7, used: 1, remaining: 6 } };
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
