import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/dashboard_provider.dart';
import 'employee_dashboard_screen.dart';

class EmployerDashboardScreen extends StatefulWidget {
  const EmployerDashboardScreen({super.key});

  @override
  State<EmployerDashboardScreen> createState() => _EmployerDashboardScreenState();
}

class _EmployerDashboardScreenState extends State<EmployerDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DashboardProvider>(context, listen: false).loadDashboard(mode: 'employer');
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final dashProvider = Provider.of<DashboardProvider>(context);
    final dashboard = dashProvider.dashboard;
    final summary = dashboard?.employerSummary;

    return Scaffold(
      appBar: AppBar(
        title: Text('${auth.branding?.name ?? 'HRMS'} Admin Console'),
        actions: [
          IconButton(
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'Switch to Employee View',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const EmployeeDashboardScreen()),
              );
            },
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
              onRefresh: () => dashProvider.loadDashboard(mode: 'employer'),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // Company Admin Header
                  Card(
                    color: Theme.of(context).colorScheme.secondary,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            backgroundColor: Colors.white24,
                            child: Icon(Icons.admin_panel_settings_rounded, color: Colors.white),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  auth.branding?.name ?? 'Company Admin',
                                  style: GoogleFonts.inter(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  'Tenant Workspace ID: ${auth.branding?.code ?? 'HRMS'}',
                                  style: GoogleFonts.inter(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Employer Telemetry Grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.4,
                    children: [
                      _buildMetricCard(
                        context,
                        'Total Employees',
                        '${summary?['totalEmployees'] ?? 0}',
                        Icons.people_alt_rounded,
                        Colors.blue,
                      ),
                      _buildMetricCard(
                        context,
                        'Present Today',
                        '${summary?['presentToday'] ?? 0}',
                        Icons.check_circle_rounded,
                        Colors.green,
                      ),
                      _buildMetricCard(
                        context,
                        'Absent Today',
                        '${summary?['absentToday'] ?? 0}',
                        Icons.cancel_rounded,
                        Colors.red,
                      ),
                      _buildMetricCard(
                        context,
                        'Attendance %',
                        summary?['attendancePercentage'] ?? '0.0%',
                        Icons.bar_chart_rounded,
                        Colors.purple,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Pending Leave Approvals Queue
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Pending Leave Approvals',
                        style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Chip(
                        label: Text('${dashboard?.pendingApprovals.length ?? 0} Pending'),
                        backgroundColor: Colors.orange.shade100,
                        labelStyle: TextStyle(color: Colors.orange.shade900, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (dashboard?.pendingApprovals.isEmpty ?? true)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Center(
                          child: Column(
                            children: [
                              const Icon(Icons.done_all_rounded, color: Colors.green, size: 40),
                              const SizedBox(height: 8),
                              Text(
                                'No pending leave requests to review.',
                                style: GoogleFonts.inter(color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    ...dashboard!.pendingApprovals.map(
                      (leave) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    leave.employeeName ?? 'Employee',
                                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      leave.leaveType,
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange.shade900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Duration: ${leave.startDate} to ${leave.endDate}',
                                style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade700),
                              ),
                              if (leave.reason.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Reason: "${leave.reason}"',
                                  style: GoogleFonts.inter(fontSize: 13, fontStyle: FontStyle.italic),
                                ),
                              ],
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

  Widget _buildMetricCard(BuildContext context, String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                ),
                Icon(icon, color: color, size: 22),
              ],
            ),
            Text(
              value,
              style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
            ),
          ],
        ),
      ),
    );
  }
}
