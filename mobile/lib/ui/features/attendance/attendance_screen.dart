import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/dashboard_provider.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dashProvider = Provider.of<DashboardProvider>(context);
    final today = dashProvider.dashboard?.today;
    final monthly = dashProvider.dashboard?.monthlySummary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Management'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Attendance Status Banner
          Card(
            color: today?.status == 'PRESENT' || today?.status == 'LATE'
                ? Colors.green.shade700
                : Colors.blueGrey.shade800,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  const Icon(Icons.verified_user_rounded, color: Colors.white, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    'Status: ${today?.status ?? 'NOT CLOCKED IN'}',
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text(
                    'Work Date: ${today?.workDate ?? 'Today'}',
                    style: GoogleFonts.inter(fontSize: 14, color: Colors.white70),
                  ),
                  const Divider(color: Colors.white24, height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildTimeBadge('Clock In', today?.clockIn ?? '--:--'),
                      _buildTimeBadge('Clock Out', today?.clockOut ?? '--:--'),
                      _buildTimeBadge('Work Time', '${today?.workHours ?? '0.0'} hrs'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Monthly Summary Stats
          Text('30-Day Attendance Overview', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Present Days',
                  '${monthly?['presentDays'] ?? 0}',
                  Icons.calendar_month,
                  Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Late Arrivals',
                  '${monthly?['lateDays'] ?? 0}',
                  Icons.alarm_on,
                  Colors.amber.shade800,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Total Hours',
                  '${monthly?['totalWorkHours'] ?? '0.0'} h',
                  Icons.timer,
                  Colors.purple,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeBadge(String title, String value) {
    return Column(
      children: [
        Text(title, style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(title, style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade600), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
