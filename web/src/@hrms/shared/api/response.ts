/**
 * Centralized API Response Envelope
 * Ensures a consistent API response structure across Backend, Web, and Mobile.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  timestamp: string; // ISO UTC format
  requestId?: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Standardized Centralized Error Response Format
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  statusCode: number;
  details?: Record<string, unknown> | Array<unknown>;
  timestamp: string; // ISO UTC format
  path?: string;
}

/**
 * Health & Readiness Status Payloads
 */
export interface HealthStatusData {
  service: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  uptime: number; // in seconds
  timestamp: string; // ISO UTC format
  version: string;
  environment: string;
}

export interface ReadinessStatusData extends HealthStatusData {
  checks: {
    database: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';
    memoryUsage: {
      rssMB: number;
      heapTotalMB: number;
      heapUsedMB: number;
    };
  };
}
