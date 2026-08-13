const API_BASE_URL = '/api/v1/employees';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface EmployeeDbRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  profilePhoto?: string;
  lastLoginAt?: string;
  createdAt?: string;
  departmentName?: string;
  designation?: string;
  branchName?: string;
  shiftName?: string;
  employmentType?: string;
  joiningDate?: string;
  salary?: number;
  gender?: string;
  dob?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  managerId?: string;
  managerName?: string;
}

export async function fetchEmployeesFromDb(params?: {
  search?: string;
  department?: string;
  status?: string;
  role?: string;
}): Promise<EmployeeDbRecord[]> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.department) query.append('department', params.department);
    if (params?.status) query.append('status', params.status);
    if (params?.role) query.append('role', params.role);

    const res = await fetch(`${API_BASE_URL}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.error('Failed to fetch employees from database:', err);
    return [];
  }
}

export async function fetchEmployeeByIdFromDb(id: string): Promise<EmployeeDbRecord | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error(`Failed to fetch employee ${id} from database:`, err);
    return null;
  }
}

export async function createEmployeeInDb(data: Partial<EmployeeDbRecord> & { password?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.error?.message || 'Failed to create employee.' };
  } catch (err) {
    return { success: false, error: 'Network error creating employee in database.' };
  }
}

export async function updateEmployeeInDb(id: string, data: Partial<EmployeeDbRecord>): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.error?.message || 'Failed to update employee.' };
  } catch (err) {
    return { success: false, error: 'Network error updating employee.' };
  }
}

export async function updateEmployeeStatusInDb(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.success) {
      return { success: true, message: json.message };
    }
    return { success: false, error: json.error?.message || 'Failed to update status.' };
  } catch (err) {
    return { success: false, error: 'Network error updating employee status.' };
  }
}
