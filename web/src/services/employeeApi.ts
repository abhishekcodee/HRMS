const API_BASE_URL = '/api/v1/employees';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

import { safeFetchJson } from '../utils/safeFetch';

export interface EmployeeDbRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'employer' | 'employee' | 'super_admin' | string;
  status: 'active' | 'inactive' | 'suspended' | string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  branchName?: string;
  shiftName?: string;
  employmentType?: string;
  joiningDate?: string;
  experienceYears?: number;
  profilePhoto?: string;
  salary?: string | number;
  basicSalary?: string | number;
  allowances?: string | number;
  deductions?: string | number;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  pfUan?: string;
  esicNumber?: string;
  dateOfBirth?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  fatherName?: string;
  spouseName?: string;
  address?: string;
  currentAddress?: string;
  currentCity?: string;
  currentState?: string;
  currentPincode?: string;
  residentialAddress?: string;
  residentialCity?: string;
  residentialState?: string;
  residentialPincode?: string;
  permanentAddress?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentPincode?: string;
  permanentAddressSame?: boolean | number;
  emergencyContact?: string;
  emergencyPhone?: string;
  managerId?: string;
  managerName?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export async function fetchNextEmployeeId(): Promise<string> {
  const result = await safeFetchJson<{ success: boolean; nextEmployeeId?: string }>(`${API_BASE_URL}/next-id`, {
    headers: getAuthHeaders(),
  });
  if (result.ok && result.data?.success && result.data.nextEmployeeId) {
    return result.data.nextEmployeeId;
  }
  return 'AMPL-00001';
}

export async function fetchEmployeesFromDb(params?: {
  search?: string;
  department?: string;
  status?: string;
  role?: string;
}): Promise<EmployeeDbRecord[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.department) query.append('department', params.department);
  if (params?.status) query.append('status', params.status);
  if (params?.role) query.append('role', params.role);

  const result = await safeFetchJson<{ success: boolean; data: EmployeeDbRecord[] }>(`${API_BASE_URL}?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (result.ok && result.data?.success && Array.isArray(result.data.data)) {
    return result.data.data;
  }
  return [];
}

export async function fetchEmployeeByIdFromDb(id: string): Promise<EmployeeDbRecord | null> {
  const result = await safeFetchJson<{ success: boolean; data: EmployeeDbRecord }>(`${API_BASE_URL}/${id}`, {
    headers: getAuthHeaders(),
  });
  if (result.ok && result.data?.success && result.data.data) {
    return result.data.data;
  }
  return null;
}

export async function createEmployeeInDb(data: Partial<EmployeeDbRecord> & { password?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  const result = await safeFetchJson<{ success: boolean; message?: string; error?: { message?: string } }>(API_BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (result.ok && result.data?.success) {
    return { success: true, message: result.data.message };
  }
  return { success: false, error: result.data?.error?.message || result.error || 'Failed to create employee.' };
}

export async function updateEmployeeInDb(id: string, data: Partial<EmployeeDbRecord>): Promise<{ success: boolean; message?: string; error?: string }> {
  const result = await safeFetchJson<{ success: boolean; message?: string; error?: { message?: string } }>(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (result.ok && result.data?.success) {
    return { success: true, message: result.data.message };
  }
  return { success: false, error: result.data?.error?.message || result.error || 'Failed to update employee.' };
}

export async function updateEmployeeStatusInDb(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<{ success: boolean; message?: string; error?: string }> {
  const result = await safeFetchJson<{ success: boolean; message?: string; error?: { message?: string } }>(`${API_BASE_URL}/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (result.ok && result.data?.success) {
    return { success: true, message: result.data.message };
  }
  return { success: false, error: result.data?.error?.message || result.error || 'Failed to update status.' };
}

export interface EmployeeAttendanceLog {
  id: string;
  workDate: string;
  clockIn?: string;
  clockOut?: string;
  workHours?: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'HALF_DAY';
  notes?: string;
}

export interface EmployeeAttendanceSummary {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalWorkHours: string;
  avgWorkHours: string;
}

export interface EmployeeAttendanceData {
  mode: 'weekly' | 'monthly';
  summary: EmployeeAttendanceSummary;
  logs: EmployeeAttendanceLog[];
}

export async function fetchEmployeeAttendanceById(id: string, mode: 'weekly' | 'monthly' = 'monthly'): Promise<EmployeeAttendanceData | null> {
  const result = await safeFetchJson<{ success: boolean; data: EmployeeAttendanceData }>(`${API_BASE_URL}/${id}/attendance?mode=${mode}`, {
    headers: getAuthHeaders(),
  });
  if (result.ok && result.data?.success && result.data.data) {
    return result.data.data;
  }
  return null;
}
