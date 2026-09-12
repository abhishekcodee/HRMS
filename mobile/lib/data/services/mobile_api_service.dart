import '../models/user_model.dart';
import '../models/dashboard_model.dart';
import '../models/leave_model.dart';
import '../models/payroll_model.dart';
import '../../core/api_client.dart';
import '../../core/api_config.dart';
import '../../core/secure_storage.dart';

class MobileApiService {
  Future<Map<String, dynamic>> login(String email, String password, {String? companyCode}) async {
    final response = await ApiClient.post(
      ApiConfig.login,
      body: {
        'email': email,
        'password': password,
        if (companyCode != null && companyCode.isNotEmpty) 'companyCode': companyCode,
      },
    );

    if (response['success'] == true) {
      final token = response['data']['token'];
      final userJson = response['data']['user'];
      final companyId = userJson['companyId'] ?? userJson['company_id'] ?? '';

      final user = UserModel.fromJson(userJson);

      await SecureStorage.saveAuthData(
        token: token,
        companyId: companyId,
        userDataJson: userJson.toString(),
      );

      return {
        'token': token,
        'user': user,
        'companyId': companyId,
      };
    } else {
      throw ApiException(response['error']?['message'] ?? 'Login failed');
    }
  }

  Future<Map<String, dynamic>> fetchConfig() async {
    final response = await ApiClient.get(ApiConfig.mobileConfig);
    if (response['success'] == true) {
      final branding = CompanyBrandingModel.fromJson(response['data']['branding']);
      final user = UserModel.fromJson(response['data']['user']);
      final featureFlags = response['data']['featureFlags'];
      return {
        'branding': branding,
        'user': user,
        'featureFlags': featureFlags,
      };
    }
    throw ApiException('Failed to load company branding');
  }

  Future<DashboardModel> fetchDashboard({String? mode}) async {
    String url = ApiConfig.mobileDashboard;
    if (mode != null) {
      url += '?mode=$mode';
    }
    final response = await ApiClient.get(url);
    if (response['success'] == true) {
      return DashboardModel.fromJson(response['data']);
    }
    throw ApiException('Failed to load dashboard');
  }

  Future<Map<String, dynamic>> checkIn({
    double? latitude,
    double? longitude,
    String? address,
    String? notes,
  }) async {
    final response = await ApiClient.post(
      ApiConfig.checkIn,
      body: {
        'latitude': latitude,
        'longitude': longitude,
        'address': address,
        'notes': notes,
      },
    );
    if (response['success'] == true) {
      return response;
    }
    throw ApiException(response['error']?['message'] ?? 'Check-in failed');
  }

  Future<Map<String, dynamic>> checkOut() async {
    final response = await ApiClient.post(ApiConfig.checkOut);
    if (response['success'] == true) {
      return response;
    }
    throw ApiException(response['error']?['message'] ?? 'Check-out failed');
  }

  Future<List<LeaveRequestModel>> fetchLeaveRequests() async {
    final response = await ApiClient.get(ApiConfig.leaveRequests);
    if (response['success'] == true) {
      final list = response['data'] as List? ?? [];
      return list.map((item) => LeaveRequestModel.fromJson(item)).toList();
    }
    throw ApiException('Failed to fetch leave requests');
  }

  Future<LeaveRequestModel> applyLeave({
    required String leaveType,
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    final response = await ApiClient.post(
      ApiConfig.applyLeave,
      body: {
        'leaveType': leaveType,
        'startDate': startDate,
        'endDate': endDate,
        'reason': reason,
      },
    );

    if (response['success'] == true) {
      return LeaveRequestModel.fromJson(response['data']);
    }
    throw ApiException(response['error']?['message'] ?? 'Failed to submit leave request');
  }

  Future<List<PayslipModel>> fetchPayslips() async {
    final response = await ApiClient.get(ApiConfig.payslips);
    if (response['success'] == true) {
      final list = response['data'] as List? ?? [];
      return list.map((item) => PayslipModel.fromJson(item)).toList();
    }
    throw ApiException('Failed to fetch payslips');
  }
}
