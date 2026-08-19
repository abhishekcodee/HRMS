export interface LeaveRecord {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  attachment?: string;
  employerId?: string;
  employerStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  employerActionBy?: string;
  employerActionAt?: string;
  employerRejectionReason?: string;
  adminId?: string;
  adminStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminActionBy?: string;
  adminActionAt?: string;
  adminRejectionReason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  overallStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  departmentName?: string;
}

export interface LeaveBalanceRecord {
  id: string;
  userId: string;
  leaveType: string;
  allocatedDays: number | string;
  usedDays: number | string;
}

export interface LeaveAuditRecord {
  id: string;
  leaveRequestId: string;
  employeeId: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  actionBy: string;
  actionDate: string;
  remarks?: string;
  ipAddress?: string;
}

export interface EmailLogRecord {
  id: string;
  employeeId?: string;
  leaveRequestId?: string;
  recipientEmail: string;
  emailType: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchLeaveBalances(): Promise<LeaveBalanceRecord[]> {
  try {
    const res = await fetch('/api/v1/leave/balances', {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch leave balances error:', err);
    return [];
  }
}

export async function fetchLeaveRequests(params?: { status?: string; leaveType?: string; search?: string; view?: string }): Promise<LeaveRecord[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.leaveType) query.append('leaveType', params.leaveType);
    if (params?.search) query.append('search', params.search);
    if (params?.view) query.append('view', params.view);

    const res = await fetch(`/api/v1/leave?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch leave requests error:', err);
    return [];
  }
}

export async function applyLeaveInDb(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  attachment?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/v1/leave', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to submit leave request.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error submitting leave request.' };
  }
}

export async function employerActionInDb(
  id: string,
  action: 'APPROVE' | 'REJECT',
  remarks?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/leave/${id}/employer-action`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, remarks }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || `Failed to ${action.toLowerCase()} leave as Employer.` };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error recording employer action.' };
  }
}

export async function adminActionInDb(
  id: string,
  action: 'APPROVE' | 'REJECT',
  remarks?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/leave/${id}/admin-action`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, remarks }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || `Failed to ${action.toLowerCase()} leave as Admin.` };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error recording admin action.' };
  }
}

export async function approveLeaveInDb(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return adminActionInDb(id, 'APPROVE');
}

export async function rejectLeaveInDb(id: string, remarks: string): Promise<{ success: boolean; message?: string; error?: string }> {
  return adminActionInDb(id, 'REJECT', remarks);
}

export async function fetchLeaveAuditTrail(): Promise<LeaveAuditRecord[]> {
  try {
    const res = await fetch('/api/v1/leave/audit-trail', {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch leave audit trail error:', err);
    return [];
  }
}

export async function fetchEmailLogs(): Promise<EmailLogRecord[]> {
  try {
    const res = await fetch('/api/v1/leave/email-logs', {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch email logs error:', err);
    return [];
  }
}

export async function retryEmailNotificationInDb(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/leave/email-logs/${id}/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to retry email.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error retrying email.' };
  }
}
