class PayslipModel {
  final String id;
  final String payPeriod;
  final double grossSalary;
  final double totalDeductions;
  final double netSalary;
  final String paymentStatus;
  final String? pdfUrl;
  final String? createdAt;

  PayslipModel({
    required this.id,
    required this.payPeriod,
    required this.grossSalary,
    required this.totalDeductions,
    required this.netSalary,
    required this.paymentStatus,
    this.pdfUrl,
    this.createdAt,
  });

  factory PayslipModel.fromJson(Map<String, dynamic> json) {
    return PayslipModel(
      id: json['id'] ?? '',
      payPeriod: json['payPeriod'] ?? json['pay_period'] ?? '',
      grossSalary: (json['grossSalary'] ?? json['gross_salary'] ?? 0).toDouble(),
      totalDeductions: (json['totalDeductions'] ?? json['total_deductions'] ?? 0).toDouble(),
      netSalary: (json['netSalary'] ?? json['net_salary'] ?? 0).toDouble(),
      paymentStatus: json['paymentStatus'] ?? json['payment_status'] ?? 'PAID',
      pdfUrl: json['pdfUrl'] ?? json['pdf_url'],
      createdAt: json['createdAt'] ?? json['created_at'],
    );
  }
}
