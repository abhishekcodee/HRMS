import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_config.dart';
import 'core/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/dashboard_provider.dart';
import 'ui/features/auth/login_screen.dart';
import 'ui/features/dashboard/employee_dashboard_screen.dart';
import 'ui/features/dashboard/employer_dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.initConfig();
  runApp(const HrmsMobileApp());
}

class HrmsMobileApp extends StatelessWidget {
  const HrmsMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initializeApp()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final branding = auth.branding;

          return MaterialApp(
            title: branding?.name ?? 'HRMS SaaS Mobile',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.createTheme(
              brandHexColor: branding?.brandColor,
              secondaryHexColor: branding?.secondaryBrandColor,
            ),
            home: _buildHome(auth),
          );
        },
      ),
    );
  }

  Widget _buildHome(AuthProvider auth) {
    if (!auth.isInitialized) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading HRMS SaaS Platform...'),
            ],
          ),
        ),
      );
    }

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    final user = auth.currentUser;
    if (user != null && user.isEmployerOrAdmin) {
      return const EmployerDashboardScreen();
    }

    return const EmployeeDashboardScreen();
  }
}
