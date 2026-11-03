import { API_BASE_URL } from '../config/api';

export interface CalendarEventRecord {
  id: string;
  title: string;
  type: 'BIRTHDAY' | 'FESTIVAL' | 'LEAVE' | 'EVENT' | string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  description?: string;
  location?: string;
  employeeName?: string;
  employeeId?: string;
  profilePhoto?: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchCalendarEventsFromDb(year: number = 2026): Promise<CalendarEventRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/calendar/events?year=${year}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch calendar events error:', err);
    return [];
  }
}

export async function createCalendarEventInDb(data: {
  title: string;
  type: 'FESTIVAL' | 'EVENT';
  date: string;
  description?: string;
  location?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/calendar/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to add event.' };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error adding event.' };
  }
}
