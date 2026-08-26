const API_BASE_URL = '/api/v1/reports';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ReportsFilterParams {
  startDate?: string;
  endDate?: string;
  department?: string;
  designation?: string;
  location?: string;
  employmentType?: string;
  status?: string;
  gender?: string;
}

export interface OverviewKpiData {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  newHires: number;
  newHiresTrendPct: string;
  attritionCount: number;
  attritionRate: string;
  attritionTrendPct: string;
  absenteeismRate: string;
  totalAbsentDays: number;
  absenteeismTrendPct: string;
  headcountGrowthPct: string;
  totalPayrollCost: number;
  avgPayrollCost: number;
  payrollTrendPct: string;
  totalOvertimeHours: number;
  totalOvertimeCost: number;
  leaveUtilizedDays: number;
  leaveAllocatedDays: number;
  leaveUtilizationPct: string;
}

export async function fetchReportsOverview(filters?: ReportsFilterParams): Promise<OverviewKpiData | null> {
  try {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'ALL') query.append(key, value);
      });
    }
    const res = await fetch(`${API_BASE_URL}/overview?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('Failed to fetch reports overview:', err);
    return null;
  }
}

export async function fetchHeadcountAnalytics(filters?: ReportsFilterParams) {
  try {
    const query = new URLSearchParams(filters as any).toString();
    const res = await fetch(`${API_BASE_URL}/headcount?${query}`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { trend: [], departments: [] };
  } catch (err) {
    console.error('Failed to fetch headcount analytics:', err);
    return { trend: [], departments: [] };
  }
}

export async function fetchNewHiresAnalytics(filters?: ReportsFilterParams) {
  try {
    const query = new URLSearchParams(filters as any).toString();
    const res = await fetch(`${API_BASE_URL}/new-hires?${query}`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { byDepartment: [], byEmploymentType: [] };
  } catch (err) {
    console.error('Failed to fetch new hires analytics:', err);
    return { byDepartment: [], byEmploymentType: [] };
  }
}

export async function fetchAttritionAnalytics(filters?: ReportsFilterParams) {
  try {
    const query = new URLSearchParams(filters as any).toString();
    const res = await fetch(`${API_BASE_URL}/attrition?${query}`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { totalLeft: 0, byDepartment: [], exitReasons: [] };
  } catch (err) {
    console.error('Failed to fetch attrition analytics:', err);
    return { totalLeft: 0, byDepartment: [], exitReasons: [] };
  }
}

export async function fetchAbsenteeismAnalytics(filters?: ReportsFilterParams) {
  try {
    const query = new URLSearchParams(filters as any).toString();
    const res = await fetch(`${API_BASE_URL}/absenteeism?${query}`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { byDepartment: [] };
  } catch (err) {
    console.error('Failed to fetch absenteeism analytics:', err);
    return { byDepartment: [] };
  }
}

export async function fetchDepartmentAnalytics() {
  try {
    const res = await fetch(`${API_BASE_URL}/department`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.error('Failed to fetch department analytics:', err);
    return [];
  }
}

export async function fetchDiversityAnalytics() {
  try {
    const res = await fetch(`${API_BASE_URL}/diversity`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { total: 0, distribution: [] };
  } catch (err) {
    console.error('Failed to fetch diversity analytics:', err);
    return { total: 0, distribution: [] };
  }
}

export async function fetchPayrollAnalytics() {
  try {
    const res = await fetch(`${API_BASE_URL}/payroll`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { totalPayrollCost: 0, avgPayrollCostPerEmployee: 0, byDepartment: [] };
  } catch (err) {
    console.error('Failed to fetch payroll analytics:', err);
    return { totalPayrollCost: 0, avgPayrollCostPerEmployee: 0, byDepartment: [] };
  }
}

export async function fetchLeaveAnalytics() {
  try {
    const res = await fetch(`${API_BASE_URL}/leave`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { byType: [] };
  } catch (err) {
    console.error('Failed to fetch leave analytics:', err);
    return { byType: [] };
  }
}

export async function fetchRecruitmentAnalytics() {
  try {
    const res = await fetch(`${API_BASE_URL}/recruitment`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json.data : { funnel: [], conversionRate: '0%', avgTimeToHireDays: 0 };
  } catch (err) {
    console.error('Failed to fetch recruitment analytics:', err);
    return { funnel: [], conversionRate: '0%', avgTimeToHireDays: 0 };
  }
}

export async function fetchDetailedReport(params: {
  type: string;
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
}) {
  try {
    const query = new URLSearchParams({
      type: params.type,
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      search: params.search || '',
      department: params.department || 'ALL',
    }).toString();

    const res = await fetch(`${API_BASE_URL}/detailed-report?${query}`, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.success ? json : { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  } catch (err) {
    console.error('Failed to fetch detailed report:', err);
    return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}
