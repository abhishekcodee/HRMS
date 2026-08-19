export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  headName?: string;
  description?: string;
  employeeCount?: number;
  teamsCount?: number;
}

export interface TeamRecord {
  id: string;
  departmentId: string;
  departmentName?: string;
  name: string;
  leaderName?: string;
  memberCount?: number;
}

export interface TeamMemberRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  profilePhoto?: string;
  designation?: string;
  departmentName?: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchDepartmentsFromDb(): Promise<DepartmentRecord[]> {
  try {
    const res = await fetch('/api/v1/master/departments', { headers: getAuthHeaders() });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch departments error:', err);
    return [];
  }
}

export async function createDepartmentInDb(data: { name: string; code: string; headName?: string; description?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/v1/master/departments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to create department.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error creating department.' };
  }
}

export async function updateDepartmentInDb(id: string, data: { name: string; code: string; headName?: string; description?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/master/departments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to update department.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating department.' };
  }
}

export async function deleteDepartmentInDb(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/master/departments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to delete department.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting department.' };
  }
}

export async function fetchTeamsFromDb(): Promise<TeamRecord[]> {
  try {
    const res = await fetch('/api/v1/master/teams', { headers: getAuthHeaders() });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch teams error:', err);
    return [];
  }
}

export async function createTeamInDb(data: { name: string; departmentId: string; leaderName?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/v1/master/teams', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to create team.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error creating team.' };
  }
}

export async function updateTeamInDb(id: string, data: { name: string; departmentId: string; leaderName?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/master/teams/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to update team.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating team.' };
  }
}

export async function deleteTeamInDb(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/v1/master/teams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to delete team.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting team.' };
  }
}

export async function fetchTeamMembersFromDb(teamId: string): Promise<TeamMemberRecord[]> {
  try {
    const res = await fetch(`/api/v1/master/teams/${teamId}/members`, { headers: getAuthHeaders() });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch team members error:', err);
    return [];
  }
}
