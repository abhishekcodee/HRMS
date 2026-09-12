import 'package:shared_preferences/shared_preferences.dart';

class SecureStorage {
  static const String keyToken = 'jwt_token';
  static const String keyCompanyId = 'company_id';
  static const String keyUserData = 'user_data';
  static const String keyBiometricEnabled = 'biometric_enabled';
  static const String keyServerUrl = 'server_url';

  static Future<String> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(keyServerUrl) ?? 'http://192.168.1.44:8080/api/v1';
  }

  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(keyServerUrl, url);
  }

  static Future<void> saveAuthData({
    required String token,
    required String companyId,
    required String userDataJson,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(keyToken, token);
    await prefs.setString(keyCompanyId, companyId);
    await prefs.setString(keyUserData, userDataJson);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(keyToken);
  }

  static Future<String?> getCompanyId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(keyCompanyId);
  }

  static Future<String?> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(keyUserData);
  }

  static Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(keyBiometricEnabled) ?? false;
  }

  static Future<void> setBiometricEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(keyBiometricEnabled, enabled);
  }

  static Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(keyToken);
    await prefs.remove(keyCompanyId);
    await prefs.remove(keyUserData);
  }
}
