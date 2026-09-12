class UserModel {
  final String id;
  final String? employeeId;
  final String fullName;
  final String email;
  final String role;
  final bool isSuperAdmin;

  UserModel({
    required this.id,
    this.employeeId,
    required this.fullName,
    required this.email,
    required this.role,
    this.isSuperAdmin = false,
  });

  bool get isEmployerOrAdmin => role == 'admin' || role == 'employer' || role == 'super_admin' || isSuperAdmin;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      employeeId: json['employeeId'] ?? json['employee_id'],
      fullName: json['fullName'] ?? json['full_name'] ?? 'Employee',
      email: json['email'] ?? '',
      role: json['role'] ?? 'employee',
      isSuperAdmin: json['isSuperAdmin'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'employeeId': employeeId,
        'fullName': fullName,
        'email': email,
        'role': role,
        'isSuperAdmin': isSuperAdmin,
      };
}

class CompanyBrandingModel {
  final String id;
  final String name;
  final String code;
  final String? logoUrl;
  final String? faviconUrl;
  final String brandColor;
  final String secondaryBrandColor;
  final String? customDomain;

  CompanyBrandingModel({
    required this.id,
    required this.name,
    required this.code,
    this.logoUrl,
    this.faviconUrl,
    this.brandColor = '#1E293B',
    this.secondaryBrandColor = '#0F172A',
    this.customDomain,
  });

  factory CompanyBrandingModel.fromJson(Map<String, dynamic> json) {
    return CompanyBrandingModel(
      id: json['id'] ?? '',
      name: json['name'] ?? 'HRMS Platform',
      code: json['code'] ?? 'HRMS',
      logoUrl: json['logoUrl'] ?? json['logo_url'],
      faviconUrl: json['faviconUrl'] ?? json['favicon_url'],
      brandColor: json['brandColor'] ?? json['brand_color'] ?? '#1E293B',
      secondaryBrandColor: json['secondaryBrandColor'] ?? json['secondary_brand_color'] ?? '#0F172A',
      customDomain: json['customDomain'] ?? json['custom_domain'],
    );
  }
}
