import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/dashboard_provider.dart';

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DashboardProvider>(context, listen: false).loadPayslips();
    });
  }

  @override
  Widget build(BuildContext context) {
    final dashProvider = Provider.of<DashboardProvider>(context);
    final payslips = dashProvider.payslips;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Salary Payslips'),
      ),
      body: dashProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => dashProvider.loadPayslips(),
              child: payslips.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey),
                          const SizedBox(height: 12),
                          Text('No payslips generated for your account yet.', style: GoogleFonts.inter(color: Colors.grey)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16.0),
                      itemCount: payslips.length,
                      itemBuilder: (context, index) {
                        final slip = payslips[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Pay Period: ${slip.payPeriod}',
                                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    Chip(
                                      label: Text(slip.paymentStatus),
                                      backgroundColor: Colors.green.shade100,
                                      labelStyle: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const Divider(height: 20),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    _buildSalaryItem('Gross Salary', '\$${slip.grossSalary.toStringAsFixed(2)}', Colors.black87),
                                    _buildSalaryItem('Deductions', '-\$${slip.totalDeductions.toStringAsFixed(2)}', Colors.red.shade700),
                                    _buildSalaryItem('Net Salary', '\$${slip.netSalary.toStringAsFixed(2)}', Colors.green.shade700),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                OutlinedButton.icon(
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Downloading Payslip PDF for ${slip.payPeriod}...')),
                                    );
                                  },
                                  icon: const Icon(Icons.download_rounded),
                                  label: const Text('Download Itemized PDF'),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }

  Widget _buildSalaryItem(String title, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600)),
        const SizedBox(height: 2),
        Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: valueColor)),
      ],
    );
  }
}
