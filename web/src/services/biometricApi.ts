export interface BiometricDeviceRecord {
  id: string;
  deviceSn: string;
  deviceName: string;
  ipAddress?: string;
  port?: number;
  location?: string;
  status: 'ONLINE' | 'OFFLINE';
  lastPingAt?: string;
  createdAt: string;
}

export interface BiometricPunchLogRecord {
  id: string;
  deviceSn: string;
  employeeId: string;
  employeeName?: string;
  punchTime: string;
  verifyType?: string;
  punchState?: string;
  createdAt: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchBiometricDevices(): Promise<BiometricDeviceRecord[]> {
  try {
    const res = await fetch('/api/v1/zkteco/devices', {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch biometric devices error:', err);
    return [];
  }
}

export async function registerBiometricDevice(data: {
  deviceSn: string;
  deviceName: string;
  ipAddress?: string;
  port?: number;
  location?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/v1/zkteco/devices', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to register eSSL device.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error registering eSSL device.' };
  }
}

export async function fetchRawBiometricLogs(): Promise<BiometricPunchLogRecord[]> {
  try {
    const res = await fetch('/api/v1/zkteco/raw-logs', {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch raw biometric logs error:', err);
    return [];
  }
}

export async function simulateBiometricPunch(data: {
  employeeId: string;
  deviceSn?: string;
  verifyType?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/v1/zkteco/simulate-punch', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to simulate punch.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error simulating punch.' };
  }
}

export async function testBiometricDeviceConnection(data: {
  ipAddress: string;
  port?: number;
  deviceSn?: string;
}): Promise<{ success: boolean; status: 'ONLINE' | 'OFFLINE'; latencyMs?: number; message?: string }> {
  try {
    const res = await fetch('/api/v1/zkteco/test-connection', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return {
      success: !!json.success,
      status: json.status || 'OFFLINE',
      latencyMs: json.latencyMs,
      message: json.message || (json.success ? 'Device online.' : 'Device offline.'),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'OFFLINE',
      message: err.message || 'Network error testing device connection.',
    };
  }
}

export async function deleteBiometricDevice(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/zkteco/devices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to remove biometric device.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error removing biometric device.' };
  }
}
