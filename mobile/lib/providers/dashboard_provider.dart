import 'package:flutter/material.dart';
import '../data/models/dashboard_model.dart';
import '../data/models/leave_model.dart';
import '../data/models/payroll_model.dart';
import '../data/services/mobile_api_service.dart';

class DashboardProvider extends ChangeNotifier {
  final MobileApiService _apiService = MobileApiService();

  DashboardModel? _dashboard;
  List<LeaveRequestModel> _leaveRequests = [];
  List<PayslipModel> _payslips = [];

  bool _isLoading = false;
  bool _isActionLoading = false;
  String? _errorMessage;
  String? _successMessage;

  DashboardModel? get dashboard => _dashboard;
  List<LeaveRequestModel> get leaveRequests => _leaveRequests;
  List<PayslipModel> get payslips => _payslips;

  bool get isLoading => _isLoading;
  bool get isActionLoading => _isActionLoading;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;

  void clearMessages() {
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();
  }

  Future<void> loadDashboard({String? mode}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _dashboard = await _apiService.fetchDashboard(mode: mode);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkIn({double? lat, double? lng, String? address, String? notes}) async {
    _isActionLoading = true;
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();

    try {
      final res = await _apiService.checkIn(
        latitude: lat,
        longitude: lng,
        address: address,
        notes: notes,
      );
      _successMessage = res['message'] ?? 'Checked in successfully!';
      await loadDashboard();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isActionLoading = false;
      notifyListeners();
    }
  }

  Future<bool> checkOut() async {
    _isActionLoading = true;
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();

    try {
      final res = await _apiService.checkOut();
      _successMessage = res['message'] ?? 'Checked out successfully!';
      await loadDashboard();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isActionLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadLeaveRequests() async {
    _isLoading = true;
    notifyListeners();

    try {
      _leaveRequests = await _apiService.fetchLeaveRequests();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> applyLeave({
    required String leaveType,
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    _isActionLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final request = await _apiService.applyLeave(
        leaveType: leaveType,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );
      _leaveRequests.insert(0, request);
      _successMessage = 'Leave request submitted successfully!';
      await loadDashboard();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isActionLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadPayslips() async {
    _isLoading = true;
    notifyListeners();

    try {
      _payslips = await _apiService.fetchPayslips();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
