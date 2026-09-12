class AttendanceRecord {
  final String? id;
  final String workDate;
  final String? clockIn;
  final String? clockOut;
  final String workHours;
  final String status;
  final String? notes;

  AttendanceRecord({
    this.id,
    required this.workDate,
    this.clockIn,
    this.clockOut,
    required this.workHours,
    required this.status,
    this.notes,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'],
      workDate: json['workDate'] ?? json['work_date'] ?? '',
      clockIn: json['clockIn'] ?? json['clock_in'],
      clockOut: json['clockOut'] ?? json['clock_out'],
      workHours: (json['workHours'] ?? json['work_hours'] ?? '0.0').toString(),
      status: json['status'] ?? 'ABSENT',
      notes: json['notes'],
    );
  }
}
