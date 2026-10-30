/**
 * HRMS System Roles as per business requirements.
 */
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["EMPLOYER"] = "EMPLOYER";
    UserRole["EMPLOYEE"] = "EMPLOYEE";
})(UserRole || (UserRole = {}));
/**
 * Standard Status Enums for System Resources.
 */
export var ResourceStatus;
(function (ResourceStatus) {
    ResourceStatus["ACTIVE"] = "ACTIVE";
    ResourceStatus["INACTIVE"] = "INACTIVE";
    ResourceStatus["ARCHIVED"] = "ARCHIVED";
})(ResourceStatus || (ResourceStatus = {}));
/**
 * Attendance Status Types.
 */
export var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["HALF_DAY"] = "HALF_DAY";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["ON_LEAVE"] = "ON_LEAVE";
})(AttendanceStatus || (AttendanceStatus = {}));
/**
 * Leave Approval Status.
 */
export var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
    LeaveStatus["CANCELLED"] = "CANCELLED";
})(LeaveStatus || (LeaveStatus = {}));
//# sourceMappingURL=index.js.map