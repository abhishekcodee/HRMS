import 'attendance_model.dart';
import 'leave_model.dart';

class DashboardModel {
  final String roleMode;
  final AttendanceRecord? today;
  final Map<String, dynamic>? monthlySummary;
  final List<LeaveBalanceModel> leaveBalances;
  final List<Map<String, dynamic>> announcements;

  // Employer specific fields
  final Map<String, dynamic>? employerSummary;
  final List<LeaveRequestModel> pendingApprovals;

  DashboardModel({
    required this.roleMode,
    this.today,
    this.monthlySummary,
    this.leaveBalances = const [],
    this.announcements = const [],
    this.employerSummary,
    this.pendingApprovals = const [],
  });

  factory DashboardModel.fromJson(Map<String, dynamic> json) {
    final roleMode = json['roleMode'] ?? 'EMPLOYEE';

    if (roleMode == 'EMPLOYER') {
      return DashboardModel(
        roleMode: roleMode,
        employerSummary: json['summary'],
        pendingApprovals: (json['pendingApprovals'] as List? ?? [])
            .map((item) => LeaveRequestModel.fromJson(item))
            .toList(),
      );
    }

    return DashboardModel(
      roleMode: roleMode,
      today: json['today'] != null ? AttendanceRecord.fromJson(json['today']) : null,
      monthlySummary: json['monthlySummary'],
      leaveBalances: (json['leaveBalances'] as List? ?? [])
          .map((item) => LeaveBalanceModel.fromJson(item))
          .toList(),
      announcements: List<Map<String, dynamic>>.from(json['announcements'] ?? []),
    );
  }
}
