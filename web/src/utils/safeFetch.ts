export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Universal safe fetch helper that prevents SyntaxError: Unexpected end of JSON input
 * across all frontend service layers.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const activeTenantId = localStorage.getItem('hrms_active_tenant_id');
    const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');

    const headers = new Headers(options?.headers || {});
    if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (activeTenantId && !headers.has('x-tenant-id')) {
      headers.set('x-tenant-id', activeTenantId);
    }

    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    
    if (!res.ok) {
      // Keep the server's explanation (e.g. "Not enough Casual Leave balance…") instead of a bare HTTP status
      let body: any = null;
      if (contentType.includes('application/json')) {
        try { body = await res.json(); } catch { body = null; }
      }
      const serverMessage = body?.error?.message || body?.message;
      return {
        ok: false,
        status: res.status,
        data: body ?? undefined,
        error: serverMessage || `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ''})`,
      };
    }

    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: res.status,
        error: `Expected JSON response but received Content-Type: ${contentType}`,
      };
    }

    const text = await res.text();
    if (!text || text.trim() === '') {
      return {
        ok: false,
        status: res.status,
        error: 'Empty response body from server',
      };
    }

    const data = JSON.parse(text) as T;
    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network request failed',
    };
  }
}
