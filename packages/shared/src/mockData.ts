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
  casualLeave: { total: number; used: number; remaining: number };
  sickLeave: { total: number; used: number; remaining: number };
  earnedLeave: { total: number; used: number; remaining: number };
}

export interface PayslipMock {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designation: string;
  monthYear: string;
  paymentDate: string;
  grossSalary: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: 'PAID' | 'PROCESSING' | 'PENDING';
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

// ------------------- MOCK DATASETS -------------------

export const MOCK_DEPARTMENTS: DepartmentMock[] = [
  {
    id: 'dept-1',
    name: 'Human Resources',
    code: 'HR',
    headName: 'Priya Sharma',
    employeeCount: 8,
    teamsCount: 2,
    description: 'Manages talent acquisition, employee relations, payroll, and HR policies.'
  },
  {
    id: 'dept-2',
    name: 'Information Technology',
    code: 'IT',
    headName: 'Aarav Patel',
    employeeCount: 24,
    teamsCount: 3,
    description: 'Core software development, infrastructure, QA, and IT support.'
  },
  {
    id: 'dept-3',
    name: 'Finance',
    code: 'FIN',
    headName: 'Rajesh Kumar',
    employeeCount: 6,
    teamsCount: 2,
    description: 'Corporate accounting, tax compliance, budgeting, and auditing.'
  },
  {
    id: 'dept-4',
    name: 'Sales',
    code: 'SLS',
    headName: 'Ananya Iyer',
    employeeCount: 15,
    teamsCount: 2,
    description: 'Enterprise business development, client relations, and revenue operations.'
  },
  {
    id: 'dept-5',
    name: 'Operations',
    code: 'OPS',
    headName: 'Vikram Singh',
    employeeCount: 12,
    teamsCount: 2,
    description: 'Supply chain management, office facilities, and day-to-day business ops.'
  }
];

export const MOCK_TEAMS: TeamMock[] = [
  { id: 'team-1', departmentId: 'dept-1', departmentName: 'Human Resources', name: 'Recruitment & Onboarding', leaderName: 'Priya Sharma', memberCount: 4 },
  { id: 'team-2', departmentId: 'dept-1', departmentName: 'Human Resources', name: 'HR Operations & Payroll', leaderName: 'Neha Gupta', memberCount: 4 },
  { id: 'team-3', departmentId: 'dept-2', departmentName: 'Information Technology', name: 'Software Development', leaderName: 'Aarav Patel', memberCount: 14 },
  { id: 'team-4', departmentId: 'dept-2', departmentName: 'Information Technology', name: 'QA & Testing', leaderName: 'Rohan Mehta', memberCount: 6 },
  { id: 'team-5', departmentId: 'dept-2', departmentName: 'Information Technology', name: 'DevOps & Infra', leaderName: 'Sanjay Reddy', memberCount: 4 },
  { id: 'team-6', departmentId: 'dept-3', departmentName: 'Finance', name: 'Accounts & Tax', leaderName: 'Rajesh Kumar', memberCount: 6 },
  { id: 'team-7', departmentId: 'dept-4', departmentName: 'Sales', name: 'Sales Operations', leaderName: 'Ananya Iyer', memberCount: 15 },
  { id: 'team-8', departmentId: 'dept-5', departmentName: 'Operations', name: 'Facilities & Ops', leaderName: 'Vikram Singh', memberCount: 12 }
];

export const MOCK_EMPLOYEES: EmployeeMock[] = [
  {
    id: 'emp-1001',
    employeeId: 'EMP-1001',
    firstName: 'Aarav',
    lastName: 'Patel',
    email: 'aarav.patel@company.com',
    phone: '+91 98765 43210',
    gender: 'Male',
    dob: '1988-05-14',
    address: '42 MG Road, Koramangala, Bengaluru, Karnataka - 560034',
    role: UserRole.ADMIN,
    designation: 'Head of IT',
    departmentId: 'dept-2',
    departmentName: 'Information Technology',
    teamId: 'team-3',
    teamName: 'Software Development',
    joiningDate: '2020-01-15',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Sunita Patel (Spouse)',
    emergencyPhone: '+91 98765 43211'
  },
  {
    id: 'emp-1002',
    employeeId: 'EMP-1002',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@company.com',
    phone: '+91 98123 45678',
    gender: 'Female',
    dob: '1991-08-22',
    address: '108 Bandra West, Mumbai, Maharashtra - 400050',
    role: UserRole.EMPLOYER,
    designation: 'HR Manager',
    departmentId: 'dept-1',
    departmentName: 'Human Resources',
    teamId: 'team-1',
    teamName: 'Recruitment & Onboarding',
    joiningDate: '2021-03-01',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Amit Sharma (Brother)',
    emergencyPhone: '+91 98123 45679'
  },
  {
    id: 'emp-1003',
    employeeId: 'EMP-1003',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    email: 'rajesh.kumar@company.com',
    phone: '+91 97654 32109',
    gender: 'Male',
    dob: '1985-11-30',
    address: '15 Connaught Place, New Delhi - 110001',
    role: UserRole.EMPLOYER,
    designation: 'Finance Manager',
    departmentId: 'dept-3',
    departmentName: 'Finance',
    teamId: 'team-6',
    teamName: 'Accounts & Tax',
    joiningDate: '2019-07-10',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Kavita Kumar (Spouse)',
    emergencyPhone: '+91 97654 32110'
  },
  {
    id: 'emp-1004',
    employeeId: 'EMP-1004',
    firstName: 'Ananya',
    lastName: 'Iyer',
    email: 'ananya.iyer@company.com',
    phone: '+91 96543 21098',
    gender: 'Female',
    dob: '1993-02-18',
    address: '88 Anna Salai, Chennai, Tamil Nadu - 600002',
    role: UserRole.EMPLOYEE,
    designation: 'Sales Lead',
    departmentId: 'dept-4',
    departmentName: 'Sales',
    teamId: 'team-7',
    teamName: 'Sales Operations',
    joiningDate: '2022-02-14',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Ramanan Iyer (Father)',
    emergencyPhone: '+91 96543 21099'
  },
  {
    id: 'emp-1005',
    employeeId: 'EMP-1005',
    firstName: 'Vikram',
    lastName: 'Singh',
    email: 'vikram.singh@company.com',
    phone: '+91 95432 10987',
    gender: 'Male',
    dob: '1987-09-05',
    address: '27 Park Street, Kolkata, West Bengal - 700016',
    role: UserRole.EMPLOYEE,
    designation: 'Operations Lead',
    departmentId: 'dept-5',
    departmentName: 'Operations',
    teamId: 'team-8',
    teamName: 'Facilities & Ops',
    joiningDate: '2020-08-01',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Gurpreet Singh (Brother)',
    emergencyPhone: '+91 95432 10988'
  },
  {
    id: 'emp-1006',
    employeeId: 'EMP-1006',
    firstName: 'Rohan',
    lastName: 'Mehta',
    email: 'rohan.mehta@company.com',
    phone: '+91 94321 09876',
    gender: 'Male',
    dob: '1994-06-12',
    address: '55 HSR Layout, Bengaluru, Karnataka - 560102',
    role: UserRole.EMPLOYEE,
    designation: 'Senior QA Engineer',
    departmentId: 'dept-2',
    departmentName: 'Information Technology',
    teamId: 'team-4',
    teamName: 'QA & Testing',
    managerId: 'emp-1001',
    managerName: 'Aarav Patel',
    joiningDate: '2022-06-01',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Meena Mehta (Mother)',
    emergencyPhone: '+91 94321 09877'
  },
  {
    id: 'emp-1007',
    employeeId: 'EMP-1007',
    firstName: 'Neha',
    lastName: 'Gupta',
    email: 'neha.gupta@company.com',
    phone: '+91 93210 98765',
    gender: 'Female',
    dob: '1995-12-03',
    address: '19 Cyber City, Gurugram, Haryana - 122002',
    role: UserRole.EMPLOYEE,
    designation: 'Payroll Specialist',
    departmentId: 'dept-1',
    departmentName: 'Human Resources',
    teamId: 'team-2',
    teamName: 'HR Operations & Payroll',
    managerId: 'emp-1002',
    managerName: 'Priya Sharma',
    joiningDate: '2023-01-10',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Sanjay Gupta (Father)',
    emergencyPhone: '+91 93210 98766'
  },
  {
    id: 'emp-1008',
    employeeId: 'EMP-1008',
    firstName: 'Karan',
    lastName: 'Verma',
    email: 'karan.verma@company.com',
    phone: '+91 92109 87654',
    gender: 'Male',
    dob: '1996-04-25',
    address: '73 Jubilee Hills, Hyderabad, Telangana - 500033',
    role: UserRole.EMPLOYEE,
    designation: 'Full Stack Developer',
    departmentId: 'dept-2',
    departmentName: 'Information Technology',
    teamId: 'team-3',
    teamName: 'Software Development',
    managerId: 'emp-1001',
    managerName: 'Aarav Patel',
    joiningDate: '2023-04-15',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Rakesh Verma (Father)',
    emergencyPhone: '+91 92109 87655'
  },
  {
    id: 'emp-1009',
    employeeId: 'EMP-1009',
    firstName: 'Siddharth',
    lastName: 'Joshi',
    email: 'siddharth.joshi@company.com',
    phone: '+91 91098 76543',
    gender: 'Male',
    dob: '1997-10-14',
    address: '12 FC Road, Pune, Maharashtra - 411004',
    role: UserRole.EMPLOYEE,
    designation: 'UI/UX Frontend Developer',
    departmentId: 'dept-2',
    departmentName: 'Information Technology',
    teamId: 'team-3',
    teamName: 'Software Development',
    managerId: 'emp-1001',
    managerName: 'Aarav Patel',
    joiningDate: '2023-09-01',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Alok Joshi (Father)',
    emergencyPhone: '+91 91098 76544'
  },
  {
    id: 'emp-1010',
    employeeId: 'EMP-1010',
    firstName: 'Divya',
    lastName: 'Nair',
    email: 'divya.nair@company.com',
    phone: '+91 90987 65432',
    gender: 'Female',
    dob: '1998-01-20',
    address: '34 Kowdiar, Thiruvananthapuram, Kerala - 695003',
    role: UserRole.EMPLOYEE,
    designation: 'Accountant',
    departmentId: 'dept-3',
    departmentName: 'Finance',
    teamId: 'team-6',
    teamName: 'Accounts & Tax',
    managerId: 'emp-1003',
    managerName: 'Rajesh Kumar',
    joiningDate: '2024-01-05',
    status: 'PROBATION',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
    emergencyContact: 'Unni Nair (Father)',
    emergencyPhone: '+91 90987 65433'
  }
];

export const MOCK_ATTENDANCE: AttendanceMock[] = [
  {
    id: 'att-101',
    employeeId: 'emp-1001',
    employeeName: 'Aarav Patel',
    employeeCode: 'EMP-1001',
    departmentName: 'Information Technology',
    date: '2026-08-11',
    checkIn: '09:02 AM',
    checkOut: '06:15 PM',
    workHours: '9h 13m',
    lateMinutes: 2,
    earlyExitMinutes: 0,
    overtimeHours: '0h 15m',
    status: AttendanceStatus.PRESENT
  },
  {
    id: 'att-102',
    employeeId: 'emp-1002',
    employeeName: 'Priya Sharma',
    employeeCode: 'EMP-1002',
    departmentName: 'Human Resources',
    date: '2026-08-11',
    checkIn: '09:35 AM',
    checkOut: '06:30 PM',
    workHours: '8h 55m',
    lateMinutes: 35,
    earlyExitMinutes: 0,
    overtimeHours: '0h 30m',
    status: AttendanceStatus.LATE
  },
  {
    id: 'att-103',
    employeeId: 'emp-1003',
    employeeName: 'Rajesh Kumar',
    employeeCode: 'EMP-1003',
    departmentName: 'Finance',
    date: '2026-08-11',
    checkIn: '08:55 AM',
    checkOut: '05:45 PM',
    workHours: '8h 50m',
    lateMinutes: 0,
    earlyExitMinutes: 15,
    overtimeHours: '0h 0m',
    status: AttendanceStatus.PRESENT
  },
  {
    id: 'att-104',
    employeeId: 'emp-1004',
    employeeName: 'Ananya Iyer',
    employeeCode: 'EMP-1004',
    departmentName: 'Sales',
    date: '2026-08-11',
    checkIn: '-',
    checkOut: '-',
    workHours: '0h 0m',
    lateMinutes: 0,
    earlyExitMinutes: 0,
    overtimeHours: '0h 0m',
    status: AttendanceStatus.ON_LEAVE
  },
  {
    id: 'att-105',
    employeeId: 'emp-1005',
    employeeName: 'Vikram Singh',
    employeeCode: 'EMP-1005',
    departmentName: 'Operations',
    date: '2026-08-11',
    checkIn: '09:00 AM',
    checkOut: '06:00 PM',
    workHours: '9h 00m',
    lateMinutes: 0,
    earlyExitMinutes: 0,
    overtimeHours: '0h 0m',
    status: AttendanceStatus.PRESENT
  },
  {
    id: 'att-106',
    employeeId: 'emp-1006',
    employeeName: 'Rohan Mehta',
    employeeCode: 'EMP-1006',
    departmentName: 'Information Technology',
    date: '2026-08-11',
    checkIn: '10:15 AM',
    checkOut: '02:30 PM',
    workHours: '4h 15m',
    lateMinutes: 75,
    earlyExitMinutes: 210,
    overtimeHours: '0h 0m',
    status: AttendanceStatus.HALF_DAY
  },
  {
    id: 'att-107',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    employeeCode: 'EMP-1008',
    departmentName: 'Information Technology',
    date: '2026-08-11',
    checkIn: '09:10 AM',
    checkOut: '-',
    workHours: '4h 30m',
    lateMinutes: 10,
    earlyExitMinutes: 0,
    overtimeHours: '0h 0m',
    status: 'MISSING_PUNCH'
  }
];

export const MOCK_LEAVE_REQUESTS: LeaveRequestMock[] = [
  {
    id: 'lvr-501',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    departmentName: 'Information Technology',
    leaveType: 'Casual Leave',
    startDate: '2026-08-18',
    endDate: '2026-08-19',
    totalDays: 2,
    reason: 'Family event and personal work at hometown.',
    status: LeaveStatus.PENDING,
    appliedDate: '2026-08-10'
  },
  {
    id: 'lvr-502',
    employeeId: 'emp-1004',
    employeeName: 'Ananya Iyer',
    departmentName: 'Sales',
    leaveType: 'Earned Leave',
    startDate: '2026-08-11',
    endDate: '2026-08-12',
    totalDays: 2,
    reason: 'Annual medical health checkup and rest.',
    status: LeaveStatus.APPROVED,
    appliedDate: '2026-08-08',
    approverName: 'Priya Sharma (HR)'
  },
  {
    id: 'lvr-503',
    employeeId: 'emp-1009',
    employeeName: 'Siddharth Joshi',
    departmentName: 'Information Technology',
    leaveType: 'Sick Leave',
    startDate: '2026-08-14',
    endDate: '2026-08-14',
    totalDays: 1,
    reason: 'Viral fever and doctor consultation.',
    status: LeaveStatus.PENDING,
    appliedDate: '2026-08-11'
  },
  {
    id: 'lvr-504',
    employeeId: 'emp-1006',
    employeeName: 'Rohan Mehta',
    departmentName: 'Information Technology',
    leaveType: 'Casual Leave',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    totalDays: 2,
    reason: 'Urgent home maintenance work.',
    status: LeaveStatus.REJECTED,
    appliedDate: '2026-07-28',
    approverName: 'Aarav Patel (Manager)'
  }
];

export const MOCK_LEAVE_BALANCE: LeaveBalanceMock = {
  casualLeave: { total: 12, used: 3, remaining: 9 },
  sickLeave: { total: 7, used: 2, remaining: 5 },
  earnedLeave: { total: 15, used: 4, remaining: 11 }
};

export const MOCK_PAYSLIPS: PayslipMock[] = [
  {
    id: 'pay-202607-1001',
    employeeId: 'emp-1001',
    employeeName: 'Aarav Patel',
    employeeCode: 'EMP-1001',
    departmentName: 'Information Technology',
    designation: 'Head of IT',
    monthYear: 'July 2026',
    paymentDate: '2026-08-01',
    grossSalary: 185000,
    basicSalary: 92500,
    hra: 46250,
    specialAllowance: 46250,
    pfDeduction: 11100,
    esiDeduction: 0,
    tdsDeduction: 22500,
    otherDeductions: 0,
    totalDeductions: 33600,
    netSalary: 151400,
    status: 'PAID'
  },
  {
    id: 'pay-202607-1002',
    employeeId: 'emp-1002',
    employeeName: 'Priya Sharma',
    employeeCode: 'EMP-1002',
    departmentName: 'Human Resources',
    designation: 'HR Manager',
    monthYear: 'July 2026',
    paymentDate: '2026-08-01',
    grossSalary: 140000,
    basicSalary: 70000,
    hra: 35000,
    specialAllowance: 35000,
    pfDeduction: 8400,
    esiDeduction: 0,
    tdsDeduction: 14000,
    otherDeductions: 0,
    totalDeductions: 22400,
    netSalary: 117600,
    status: 'PAID'
  },
  {
    id: 'pay-202607-1008',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    employeeCode: 'EMP-1008',
    departmentName: 'Information Technology',
    designation: 'Full Stack Developer',
    monthYear: 'July 2026',
    paymentDate: '2026-08-01',
    grossSalary: 85000,
    basicSalary: 42500,
    hra: 21250,
    specialAllowance: 21250,
    pfDeduction: 5100,
    esiDeduction: 637.5,
    tdsDeduction: 4500,
    otherDeductions: 0,
    totalDeductions: 10237.5,
    netSalary: 74762.5,
    status: 'PAID'
  }
];

export const MOCK_DOCUMENTS: DocumentMock[] = [
  {
    id: 'doc-1',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    title: 'Aadhaar Card Copy',
    category: 'Identity Proof',
    fileName: 'karan_verma_aadhaar.pdf',
    fileSize: '1.4 MB',
    uploadedAt: '2023-04-16',
    status: 'VERIFIED'
  },
  {
    id: 'doc-2',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    title: 'PAN Card Copy',
    category: 'Identity Proof',
    fileName: 'karan_verma_pan.pdf',
    fileSize: '890 KB',
    uploadedAt: '2023-04-16',
    status: 'VERIFIED'
  },
  {
    id: 'doc-3',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    title: 'Employment Agreement 2023',
    category: 'Employment Contract',
    fileName: 'employment_contract_verma.pdf',
    fileSize: '3.2 MB',
    uploadedAt: '2023-04-15',
    status: 'VERIFIED'
  },
  {
    id: 'doc-4',
    employeeId: 'emp-1008',
    employeeName: 'Karan Verma',
    title: 'Form 12BB Investment Declaration',
    category: 'Tax Document',
    fileName: 'form12bb_2026.pdf',
    fileSize: '1.1 MB',
    uploadedAt: '2026-05-10',
    status: 'PENDING'
  }
];

export const MOCK_NOTIFICATIONS: NotificationMock[] = [
  {
    id: 'notif-1',
    type: 'LEAVE',
    title: 'Leave Request Approved',
    message: 'Your Earned Leave request for Aug 11 - Aug 12 has been approved by Priya Sharma.',
    timestamp: '10 minutes ago',
    read: false,
    link: '/my-leave'
  },
  {
    id: 'notif-2',
    type: 'PAYROLL',
    title: 'July 2026 Payslip Released',
    message: 'Your salary payslip for July 2026 is now available for download.',
    timestamp: '2 hours ago',
    read: false,
    link: '/my-payslips'
  },
  {
    id: 'notif-3',
    type: 'ATTENDANCE',
    title: 'Attendance Punch Exception',
    message: 'Missing check-out logged for Aug 10. Please submit regularisation if applicable.',
    timestamp: '1 day ago',
    read: true,
    link: '/my-attendance'
  },
  {
    id: 'notif-4',
    type: 'SYSTEM',
    title: 'System Maintenance Notice',
    message: 'HRMS platform maintenance scheduled on Sunday, Aug 16 between 02:00 AM - 04:00 AM IST.',
    timestamp: '2 days ago',
    read: true
  }
];

export const MOCK_AUDIT_LOGS: AuditLogMock[] = [
  {
    id: 'log-801',
    timestamp: '2026-08-11 11:45:22 UTC',
    actorName: 'Priya Sharma',
    actorRole: UserRole.EMPLOYER,
    action: 'LEAVE_APPROVE',
    module: 'Leave Management',
    details: 'Approved Earned Leave LVR-502 for Ananya Iyer (2 days)',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log-802',
    timestamp: '2026-08-11 09:30:10 UTC',
    actorName: 'Aarav Patel',
    actorRole: UserRole.ADMIN,
    action: 'EMPLOYEE_UPDATE',
    module: 'Employee Directory',
    details: 'Updated role & designation for Divya Nair (EMP-1010)',
    ipAddress: '192.168.1.12'
  },
  {
    id: 'log-803',
    timestamp: '2026-08-10 16:12:00 UTC',
    actorName: 'Neha Gupta',
    actorRole: UserRole.EMPLOYEE,
    action: 'PAYROLL_DISBURSED',
    module: 'Payroll Engine',
    details: 'Generated July 2026 salary batch disbursal for 65 active employees',
    ipAddress: '192.168.1.88'
  }
];
