/**
 * HRMS System Roles as per business requirements.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYER = 'EMPLOYER',
  EMPLOYEE = 'EMPLOYEE'
}

/**
 * Standard Status Enums for System Resources.
 */
export enum ResourceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Attendance Status Types.
 */
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  LATE = 'LATE',
  ON_LEAVE = 'ON_LEAVE'
}

/**
 * Leave Approval Status.
 */
export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}
