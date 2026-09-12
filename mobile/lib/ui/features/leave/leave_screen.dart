import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/dashboard_provider.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DashboardProvider>(context, listen: false).loadLeaveRequests();
    });
  }

  void _showApplyLeaveModal() {
    final typeController = TextEditingController(text: 'Casual Leave');
    final startDateController = TextEditingController(text: DateTime.now().toString().split(' ')[0]);
    final endDateController = TextEditingController(text: DateTime.now().toString().split(' ')[0]);
    final reasonController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Apply for Leave', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: 'Casual Leave',
                items: const [
                  DropdownMenuItem(value: 'Casual Leave', child: Text('Casual Leave')),
                  DropdownMenuItem(value: 'Sick Leave', child: Text('Sick Leave')),
                  DropdownMenuItem(value: 'Earned Leave', child: Text('Earned Leave')),
                ],
                onChanged: (val) => typeController.text = val ?? 'Casual Leave',
                decoration: const InputDecoration(labelText: 'Leave Type'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: startDateController,
                      decoration: const InputDecoration(labelText: 'Start Date (YYYY-MM-DD)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: endDateController,
                      decoration: const InputDecoration(labelText: 'End Date (YYYY-MM-DD)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: reasonController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Reason'),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () async {
                  final provider = Provider.of<DashboardProvider>(context, listen: false);
                  final ok = await provider.applyLeave(
                    leaveType: typeController.text,
                    startDate: startDateController.text,
                    endDate: endDateController.text,
                    reason: reasonController.text,
                  );
                  if (ok && mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Leave application submitted successfully!')),
                    );
                  }
                },
                child: const Text('Submit Application'),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashProvider = Provider.of<DashboardProvider>(context);
    final requests = dashProvider.leaveRequests;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Leave Requests'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showApplyLeaveModal,
        icon: const Icon(Icons.add),
        label: const Text('Apply Leave'),
      ),
      body: dashProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => dashProvider.loadLeaveRequests(),
              child: requests.isEmpty
                  ? Center(
                      child: Text(
                        'No leave requests submitted yet.',
                        style: GoogleFonts.inter(color: Colors.grey),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16.0),
                      itemCount: requests.length,
                      itemBuilder: (context, index) {
                        final req = requests[index];
                        final isApproved = req.status == 'APPROVED';
                        final isPending = req.status == 'PENDING';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            title: Text(
                              '${req.leaveType} (${req.totalDays} Days)',
                              style: GoogleFonts.inter(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text('${req.startDate} to ${req.endDate}\nReason: ${req.reason}'),
                            isThreeLine: true,
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isApproved
                                    ? Colors.green.shade100
                                    : isPending
                                        ? Colors.orange.shade100
                                        : Colors.red.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                req.status,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isApproved
                                      ? Colors.green.shade900
                                      : isPending
                                          ? Colors.orange.shade900
                                          : Colors.red.shade900,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
