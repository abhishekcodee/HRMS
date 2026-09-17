import { NotificationMock, MOCK_NOTIFICATIONS } from '@hrms/shared';

const API_BASE_URL = '/api/v1/notifications';
const STORAGE_KEY = 'hrms_notifications_v1';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Get cached notifications from localStorage
export function getLocalNotifications(): NotificationMock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading local notifications:', err);
  }
  // Default fallback seed
  return MOCK_NOTIFICATIONS;
}

// Save notifications to localStorage
export function saveLocalNotifications(notifications: NotificationMock[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('Error saving local notifications:', err);
  }
}

export async function fetchNotifications(): Promise<NotificationMock[]> {
  try {
    const res = await fetch(API_BASE_URL, { headers: getAuthHeaders() });
    if (!res.ok) {
      console.warn(`Backend notification fetch returned status ${res.status}`);
      return getLocalNotifications();
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`Backend notification fetch returned non-JSON content type: ${contentType}`);
      return getLocalNotifications();
    }
    const text = await res.text();
    if (!text || text.trim() === '') {
      console.warn('Backend notification fetch returned empty response body');
      return getLocalNotifications();
    }
    const json = JSON.parse(text);
    if (json.success && Array.isArray(json.data)) {
      saveLocalNotifications(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn('Backend notification fetch failed, using local cache:', err);
  }
  return getLocalNotifications();
}

export async function markNotificationReadApi(id?: string): Promise<NotificationMock[]> {
  const current = getLocalNotifications();
  const updated = current.map(n => (!id || n.id === id ? { ...n, read: true } : n));
  saveLocalNotifications(updated);

  try {
    const res = await fetch(`${API_BASE_URL}/mark-read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      console.warn(`Backend mark notification read status ${res.status}`);
    }
  } catch (err) {
    console.warn('Backend mark notification read failed:', err);
  }
  return updated;
}

export async function createNotificationApi(
  newNotif: Omit<NotificationMock, 'id' | 'timestamp' | 'read'>
): Promise<NotificationMock[]> {
  const current = getLocalNotifications();
  const created: NotificationMock = {
    ...newNotif,
    id: `notif-${Date.now()}`,
    timestamp: 'Just now',
    read: false,
  };
  const updated = [created, ...current];
  saveLocalNotifications(updated);

  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newNotif),
    });
    if (!res.ok) {
      console.warn(`Backend notification creation status ${res.status}`);
    }
  } catch (err) {
    console.warn('Backend notification creation failed:', err);
  }
  return updated;
}

export async function deleteNotificationApi(id: string): Promise<NotificationMock[]> {
  const current = getLocalNotifications();
  const updated = current.filter(n => n.id !== id);
  saveLocalNotifications(updated);

  try {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      console.warn(`Backend notification deletion status ${res.status}`);
    }
  } catch (err) {
    console.warn('Backend notification deletion failed:', err);
  }
  return updated;
}

export async function clearAllNotificationsApi(): Promise<NotificationMock[]> {
  saveLocalNotifications([]);
  try {
    const res = await fetch(`${API_BASE_URL}/all`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      console.warn(`Backend clear all notifications status ${res.status}`);
    }
  } catch (err) {
    console.warn('Backend clear all notifications failed:', err);
  }
  return [];
}
