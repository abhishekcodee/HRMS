import { UserRole, AttendanceStatus, LeaveStatus } from './enums/index.js';
export interface DepartmentMock {
    id: string;
    name: string;
    code: string;
    headName: string;
    employeeCount: number;
    teamsCount: number;
    description: string;
}
export interface TeamMock {
    id: string;
    departmentId: string;
    departmentName: string;
    name: string;
    leaderName: string;
    memberCount: number;
}
export interface EmployeeMock {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    gender: 'Male' | 'Female' | 'Other';
    dob: string;
    address: string;
    role: UserRole;
    designation: string;
    departmentId: string;
    departmentName: string;
    teamId: string;
    teamName: string;
    managerId?: string;
    managerName?: string;
    joiningDate: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PROBATION' | 'NOTICE_PERIOD';
    avatar: string;
    emergencyContact: string;
    emergencyPhone: string;
}
export interface AttendanceMock {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    departmentName: string;
    date: string;
    checkIn: string;
    checkOut: string;
    workHours: string;
    lateMinutes: number;
    earlyExitMinutes: number;
    overtimeHours: string;
    status: AttendanceStatus | 'MISSING_PUNCH' | 'HOLIDAY';
}
export interface LeaveRequestMock {
    id: string;
    employeeId: string;
    employeeName: string;
    departmentName: string;
    leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Maternity Leave' | 'Unpaid Leave';
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: LeaveStatus;
    appliedDate: string;
    approverName?: string;
}
export interface LeaveBalanceMock {
    casualLeave: {
        total: number;
        used: number;
        remaining: number;
    };
    sickLeave: {
        total: number;
        used: number;
        remaining: number;
    };
    earnedLeave: {
        total: number;
        used: number;
        remaining: number;
    };
}
export interface DocumentMock {
    id: string;
    employeeId: string;
    employeeName: string;
    title: string;
    category: 'Identity Proof' | 'Employment Contract' | 'Tax Document' | 'Education Certificate' | 'Company Policy';
    fileName: string;
    fileSize: string;
    uploadedAt: string;
    status: 'VERIFIED' | 'PENDING' | 'REJECTED';
}
export interface NotificationMock {
    id: string;
    type: 'LEAVE' | 'ATTENDANCE' | 'PAYROLL' | 'DOCUMENT' | 'SYSTEM';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
}
export interface AuditLogMock {
    id: string;
    timestamp: string;
    actorName: string;
    actorRole: UserRole;
    action: string;
    module: string;
    details: string;
    ipAddress: string;
}
export declare const MOCK_DEPARTMENTS: DepartmentMock[];
export declare const MOCK_TEAMS: TeamMock[];
export declare const MOCK_EMPLOYEES: EmployeeMock[];
export declare const MOCK_ATTENDANCE: AttendanceMock[];
export declare const MOCK_LEAVE_REQUESTS: LeaveRequestMock[];
export declare const MOCK_LEAVE_BALANCE: LeaveBalanceMock;
export declare const MOCK_DOCUMENTS: DocumentMock[];
export declare const MOCK_NOTIFICATIONS: NotificationMock[];
export declare const MOCK_AUDIT_LOGS: AuditLogMock[];
//# sourceMappingURL=mockData.d.ts.map