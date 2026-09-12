import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/api_config.dart';
import '../../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'superadmin@hrms.com');
  final _passwordController = TextEditingController(text: 'SuperAdmin@123');
  final _companyCodeController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _companyCodeController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.login(
      _emailController.text.trim(),
      _passwordController.text.trim(),
      companyCode: _companyCodeController.text.trim().isNotEmpty
          ? _companyCodeController.text.trim()
          : null,
    );

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? 'Authentication failed'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  void _showServerSettingsDialog() {
    final serverUrlController = TextEditingController(text: ApiConfig.baseUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Server Connection Settings', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter the backend API server base URL:',
              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: serverUrlController,
              decoration: const InputDecoration(
                labelText: 'Server Base URL',
                hintText: 'http://192.168.1.44:8080/api/v1',
                prefixIcon: Icon(Icons.dns_rounded),
              ),
            ),
            const SizedBox(height: 16),
            Text('Quick Presets:', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ActionChip(
                  label: const Text('Wi-Fi PC (192.168.1.44)'),
                  onPressed: () => serverUrlController.text = 'http://192.168.1.44:8080/api/v1',
                ),
                ActionChip(
                  label: const Text('Emulator (10.0.2.2)'),
                  onPressed: () => serverUrlController.text = 'http://10.0.2.2:8080/api/v1',
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newUrl = serverUrlController.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiConfig.updateBaseUrl(newUrl);
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Server URL updated to: $newUrl')),
                  );
                }
              }
            },
            child: const Text('Save & Apply'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final branding = authProvider.branding;

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            // Settings Top Right Icon Button
            Positioned(
              top: 12,
              right: 12,
              child: IconButton(
                icon: const Icon(Icons.settings_rounded),
                tooltip: 'Server Connection Settings',
                onPressed: _showServerSettingsDialog,
              ),
            ),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo / Header
                      Center(
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                                blurRadius: 16,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.business_center_rounded,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        branding?.name ?? 'HRMS SaaS Platform',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Multi-Tenant Mobile HR & Payroll System',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: _showServerSettingsDialog,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.wifi_rounded, size: 14, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text(
                              'Server: ${ApiConfig.baseUrl}',
                              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Company Code Field
                      TextFormField(
                        controller: _companyCodeController,
                        decoration: const InputDecoration(
                          labelText: 'Company Code (Optional)',
                          hintText: 'e.g. DEMO-CORP',
                          prefixIcon: Icon(Icons.apartment_rounded),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Email Field
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Please enter your email';
                          return null;
                        },
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          hintText: 'employee@company.com',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Please enter your password';
                          return null;
                        },
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                            ),
                            onPressed: () {
                              setState(() => _obscurePassword = !_obscurePassword);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Login Button
                      ElevatedButton(
                        onPressed: authProvider.isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: authProvider.isLoading
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : Text(
                                'Sign In to Workspace',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
