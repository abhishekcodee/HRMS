export interface ExcelValidationSummary {
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  missingEmailCount: number;
  missingSlipFileCount: number;
}

export interface ExcelSalaryRecordPreview {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  salaryMonth: string;
  salaryYear: string;
  salarySlipFile?: string;
  isValid: boolean;
  validationError?: string;
}

export interface BulkSendResultDetail {
  employeeId: string;
  employeeName: string;
  email: string;
  salaryMonth: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage?: string;
  sentTime?: string;
}

export interface BulkSendSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface SalarySlipLogRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail: string;
  salaryMonth: string;
  salaryYear: string;
  salarySlipFile?: string;
  emailSubject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function validateSalarySlipExcel(file: File): Promise<{
  success: boolean;
  summary?: ExcelValidationSummary;
  preview?: ExcelSalaryRecordPreview[];
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('excelFile', file);

    const res = await fetch('/api/v1/payroll/salary-slips/validate-excel', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to validate Excel file.' };
    }

    return {
      success: true,
      summary: json.summary,
      preview: json.preview,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error parsing Excel file.' };
  }
}

export async function sendBulkSalarySlips(items: ExcelSalaryRecordPreview[]): Promise<{
  success: boolean;
  summary?: BulkSendSummary;
  details?: BulkSendResultDetail[];
  error?: string;
}> {
  try {
    const token = localStorage.getItem('hrms_token');
    const res = await fetch('/api/v1/payroll/salary-slips/send-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to send bulk salary slips.' };
    }

    return {
      success: true,
      summary: json.summary,
      details: json.details,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error executing bulk salary slip emails.' };
  }
}

export async function retryFailedSalarySlips(): Promise<{
  success: boolean;
  summary?: { total: number; sent: number; failed: number };
  message?: string;
  error?: string;
}> {
  try {
    const token = localStorage.getItem('hrms_token');
    const res = await fetch('/api/v1/payroll/salary-slips/retry-failed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error?.message || 'Failed to retry salary slips.' };
    }

    return {
      success: true,
      summary: json.summary,
      message: json.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error retrying failed salary slips.' };
  }
}

export async function fetchSalarySlipLogs(): Promise<SalarySlipLogRecord[]> {
  try {
    const token = localStorage.getItem('hrms_token');
    const res = await fetch('/api/v1/payroll/salary-slips/logs', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error('Fetch salary slip logs error:', err);
    return [];
  }
}
