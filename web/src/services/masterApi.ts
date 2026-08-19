const API_BASE_URL = '/api/v1/master';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface MasterDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface MasterDesignation {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
}

export interface MasterBranch {
  id: string;
  name: string;
  code: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface MasterShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface MasterEmploymentType {
  id: string;
  name: string;
  code: string;
}

export async function fetchMasterDepartments(): Promise<MasterDepartment[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/departments`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.error('Failed to fetch departments:', err);
    return [];
  }
}

export async function createMasterDepartment(name: string, code: string, description?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, code, description }),
    });
    const json = await res.json();
    return json.success;
  } catch (err) {
    console.error('Failed to create department:', err);
    return false;
  }
}

export async function fetchMasterDesignations(): Promise<MasterDesignation[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/designations`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.error('Failed to fetch designations:', err);
    return [];
  }
}

export async function createMasterDesignation(name: string, departmentName?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/designations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, departmentName }),
    });
    const json = await res.json();
    return json.success;
  } catch (err) {
    console.error('Failed to create designation:', err);
    return false;
  }
}

export async function fetchMasterBranches(): Promise<MasterBranch[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/branches`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    return [];
  }
}

export async function fetchMasterShifts(): Promise<MasterShift[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/shifts`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    return [];
  }
}

export async function fetchMasterEmploymentTypes(): Promise<MasterEmploymentType[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/employment-types`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    return [];
  }
}
