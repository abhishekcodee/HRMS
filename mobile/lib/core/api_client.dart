import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';
import 'secure_storage.dart';

class ApiClient {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await SecureStorage.getToken();
    final companyId = await SecureStorage.getCompanyId();

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    if (companyId != null && companyId.isNotEmpty) {
      headers['x-company-id'] = companyId;
    }

    return headers;
  }

  static Future<dynamic> get(String url) async {
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(url), headers: headers).timeout(ApiConfig.timeoutDuration);
    return _processResponse(response);
  }

  static Future<dynamic> post(String url, {Map<String, dynamic>? body}) async {
    final headers = await _getHeaders();
    final response = await http
        .post(
          Uri.parse(url),
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        )
        .timeout(ApiConfig.timeoutDuration);
    return _processResponse(response);
  }

  static dynamic _processResponse(http.Response response) {
    final body = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    } else {
      final message = body['error']?['message'] ?? 'An error occurred (${response.statusCode})';
      throw ApiException(message, statusCode: response.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, {this.statusCode = 500});

  @override
  String toString() => message;
}
