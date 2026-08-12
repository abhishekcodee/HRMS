/**
 * Organization Hierarchy Domain Interfaces
 * Hierarchy: Company -> Department -> Team -> Manager -> Employee
 */

export interface CompanySummary {
  id: string; // UUIDv4
  name: string;
  code: string;
  createdAt: string; // UTC ISO string
}

export interface DepartmentSummary {
  id: string; // UUIDv4
  companyId: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface TeamSummary {
  id: string; // UUIDv4
  departmentId: string;
  name: string;
  createdAt: string;
}

export interface UserBasicProfile {
  id: string; // UUIDv4
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
}
