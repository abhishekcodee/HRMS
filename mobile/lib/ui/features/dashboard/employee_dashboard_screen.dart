import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/dashboard_provider.dart';
import '../attendance/attendance_screen.dart';
import '../leave/leave_screen.dart';
import '../payroll/payroll_screen.dart';

class EmployeeDashboardScreen extends StatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  State<EmployeeDashboardScreen> createState() => _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DashboardProvider>(context, listen: false).loadDashboard(mode: 'employee');
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final dashProvider = Provider.of<DashboardProvider>(context);
    final user = auth.currentUser;
    final dashboard = dashProvider.dashboard;
    final today = dashboard?.today;

    return Scaffold(
      appBar: AppBar(
        title: Text(auth.branding?.name ?? 'HRMS Portal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => dashProvider.loadDashboard(mode: 'employee'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: dashProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => dashProvider.loadDashboard(mode: 'employee'),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // User Welcome Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.15),
                            child: Text(
                              (user?.fullName.isNotEmpty == true ? user!.fullName[0] : 'E').toUpperCase(),
                              style: GoogleFonts.inter(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Welcome back, ${user?.fullName ?? 'Employee'}!',
                                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  'ID: ${user?.employeeId ?? 'EMP-001'} | ${user?.role.toUpperCase()}',
                                  style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Today Clock-In / Clock-Out Card
                  Card(
                    color: Theme.of(context).colorScheme.primary,
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'TODAY ATTENDANCE',
                                    style: GoogleFonts.inter(
                                      color: Colors.white70,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 1.1,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    today?.workDate ?? 'Today',
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: today?.status == 'PRESENT' || today?.status == 'LATE'
                                      ? Colors.green.shade600
                                      : Colors.orange.shade700,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  today?.status ?? 'NOT CLOCKED IN',
                                  style: GoogleFonts.inter(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              Column(
                                children: [
                                  const Icon(Icons.login, color: Colors.white70, size: 20),
                                  const SizedBox(height: 4),
                                  Text('Clock In', style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                                  Text(
                                    today?.clockIn ?? '--:--',
                                    style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Container(height: 30, width: 1, color: Colors.white24),
                              Column(
                                children: [
                                  const Icon(Icons.logout, color: Colors.white70, size: 20),
                                  const SizedBox(height: 4),
                                  Text('Clock Out', style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                                  Text(
                                    today?.clockOut ?? '--:--',
                                    style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Container(height: 30, width: 1, color: Colors.white24),
                              Column(
                                children: [
                                  const Icon(Icons.timer_outlined, color: Colors.white70, size: 20),
                                  const SizedBox(height: 4),
                                  Text('Hours', style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                                  Text(
                                    '${today?.workHours ?? '0.0'} hrs',
                                    style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.touch_app_rounded),
                                  label: Text(today?.clockIn != null ? 'Checked In' : 'Clock In Now'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: Theme.of(context).colorScheme.primary,
                                  ),
                                  onPressed: today?.clockIn != null || dashProvider.isActionLoading
                                      ? null
                                      : () async {
                                          final ok = await dashProvider.checkIn();
                                          if (ok && mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text(dashProvider.successMessage ?? 'Checked in!')),
                                            );
                                          }
                                        },
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  icon: const Icon(Icons.exit_to_app_rounded),
                                  label: Text(today?.clockOut != null ? 'Checked Out' : 'Clock Out'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Colors.white),
                                  ),
                                  onPressed: today?.clockIn == null || today?.clockOut != null || dashProvider.isActionLoading
                                      ? null
                                      : () async {
                                          final ok = await dashProvider.checkOut();
                                          if (ok && mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text(dashProvider.successMessage ?? 'Checked out!')),
                                            );
                                          }
                                        },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Quick Access Menu
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveScreen())),
                          child: _buildMenuTile(context, Icons.event_available, 'Leave Management', Colors.blue),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PayrollScreen())),
                          child: _buildMenuTile(context, Icons.receipt_long, 'My Payslips', Colors.green),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen())),
                          child: _buildMenuTile(context, Icons.access_time_filled, 'Attendance', Colors.purple),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Leave Balances Section
                  Text(
                    'Leave Balances',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  if (dashboard?.leaveBalances.isNotEmpty == true)
                    ...dashboard!.leaveBalances.map(
                      (b) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(b.type, style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                          subtitle: Text('Allocated: ${b.allocated} | Used: ${b.used}'),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${b.remaining} Days Left',
                              style: GoogleFonts.inter(
                                color: Colors.blue.shade800,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildMenuTile(BuildContext context, IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
