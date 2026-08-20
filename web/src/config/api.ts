export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;

export function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('hrms_auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
