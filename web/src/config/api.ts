const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_BASE_URL = envApiUrl
  ? `${envApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')}/api/v1`
  : (typeof window !== 'undefined'
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? `${window.location.protocol}//${window.location.hostname}:4000/api/v1`
          : '/api/v1')
      : 'https://hrms-backend-dlez.onrender.com/api/v1');

export function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('hrms_auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
