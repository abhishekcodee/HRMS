import 'package:flutter/material.dart';
import '../data/models/user_model.dart';
import '../data/services/mobile_api_service.dart';
import '../core/secure_storage.dart';

class AuthProvider extends ChangeNotifier {
  final MobileApiService _apiService = MobileApiService();

  UserModel? _currentUser;
  CompanyBrandingModel? _branding;
  Map<String, dynamic> _featureFlags = {};

  bool _isLoading = false;
  bool _isInitialized = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  CompanyBrandingModel? get branding => _branding;
  Map<String, dynamic> get featureFlags => _featureFlags;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;

  Future<void> initializeApp() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await SecureStorage.getToken();
      if (token != null && token.isNotEmpty) {
        final configData = await _apiService.fetchConfig();
        _branding = configData['branding'];
        _currentUser = configData['user'];
        _featureFlags = configData['featureFlags'] ?? {};
      }
    } catch (e) {
      print('App initialization token check error: $e');
      await SecureStorage.clearAll();
    } finally {
      _isLoading = false;
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password, {String? companyCode}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _apiService.login(email, password, companyCode: companyCode);
      _currentUser = result['user'];

      // Fetch dynamic white-label config
      final configData = await _apiService.fetchConfig();
      _branding = configData['branding'];
      _featureFlags = configData['featureFlags'] ?? {};

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorage.clearAll();
    _currentUser = null;
    _branding = null;
    notifyListeners();
  }
}
