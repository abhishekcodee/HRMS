import 'secure_storage.dart';

class ApiConfig {
  static String baseUrl = 'http://192.168.1.44:8080/api/v1';

  static Future<void> initConfig() async {
    baseUrl = await SecureStorage.getServerUrl();
  }

  static Future<void> updateBaseUrl(String url) async {
    baseUrl = url;
    await SecureStorage.setServerUrl(url);
  }

  static const Duration timeoutDuration = Duration(seconds: 15);

  // Endpoints
  static String get login => '$baseUrl/auth/login';
  static String get mobileConfig => '$baseUrl/mobile/config';
  static String get mobileDashboard => '$baseUrl/mobile/dashboard';
  static String get checkIn => '$baseUrl/mobile/attendance/check-in';
  static String get checkOut => '$baseUrl/mobile/attendance/check-out';
  static String get leaveRequests => '$baseUrl/mobile/leave/my-requests';
  static String get applyLeave => '$baseUrl/mobile/leave/apply';
  static String get payslips => '$baseUrl/mobile/payroll/my-payslips';
}
