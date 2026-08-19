export interface LeaveRecord {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  departmentName?: string;
}

export interface LeaveAuditRecord {
  id: string;
  leaveRequestId: string;
  employeeId: string;
  action: 'LEAVE_APPLIED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
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

export async function fetchLeaveRequests(params?: { status?: string; leaveType?: string; search?: string }): Promise<LeaveRecord[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.leaveType) query.append('leaveType', params.leaveType);
    if (params?.search) query.append('search', params.search);

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

export async function applyLeaveInDb(data: { leaveType: string; startDate: string; endDate: string; daysCount: number; reason?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
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

export async function approveLeaveInDb(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/leave/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to approve leave request.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error approving leave request.' };
  }
}

export async function rejectLeaveInDb(id: string, remarks: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/leave/${id}/reject`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ remarks }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to reject leave request.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error rejecting leave request.' };
  }
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
