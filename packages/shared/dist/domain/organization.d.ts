/**
 * Organization Hierarchy Domain Interfaces
 * Hierarchy: Company -> Department -> Team -> Manager -> Employee
 */
export interface CompanySummary {
    id: string;
    name: string;
    code: string;
    createdAt: string;
}
export interface DepartmentSummary {
    id: string;
    companyId: string;
    name: string;
    code: string;
    createdAt: string;
}
export interface TeamSummary {
    id: string;
    departmentId: string;
    name: string;
    createdAt: string;
}
export interface UserBasicProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    departmentId?: string;
    teamId?: string;
    managerId?: string;
}
//# sourceMappingURL=organization.d.ts.map