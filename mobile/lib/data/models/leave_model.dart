class LeaveRequestModel {
  final String id;
  final String leaveType;
  final String startDate;
  final String endDate;
  final int totalDays;
  final String reason;
  final String status;
  final String? createdAt;
  final String? employeeName;
  final String? employeeId;

  LeaveRequestModel({
    required this.id,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.totalDays,
    required this.reason,
    required this.status,
    this.createdAt,
    this.employeeName,
    this.employeeId,
  });

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    return LeaveRequestModel(
      id: json['id'] ?? '',
      leaveType: json['leaveType'] ?? json['leave_type'] ?? 'Casual Leave',
      startDate: json['startDate'] ?? json['start_date'] ?? '',
      endDate: json['endDate'] ?? json['end_date'] ?? '',
      totalDays: json['totalDays'] ?? json['total_days'] ?? 1,
      reason: json['reason'] ?? '',
      status: json['status'] ?? 'PENDING',
      createdAt: json['createdAt'] ?? json['created_at'],
      employeeName: json['employeeName'] ?? json['employee_name'],
      employeeId: json['employeeId'] ?? json['employee_id'],
    );
  }
}

class LeaveBalanceModel {
  final String type;
  final int allocated;
  final int used;
  final int remaining;

  LeaveBalanceModel({
    required this.type,
    required this.allocated,
    required this.used,
    required this.remaining,
  });

  factory LeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceModel(
      type: json['type'] ?? json['leave_type'] ?? 'Leave',
      allocated: json['allocated'] ?? json['total_allocated'] ?? 0,
      used: json['used'] ?? 0,
      remaining: json['remaining'] ?? 0,
    );
  }
}
