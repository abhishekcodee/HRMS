import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MOCK_PAYSLIPS } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { MobileButton } from '../components/MobileButton';

export const PayslipsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>My Payslips</Text>
      <Text style={styles.sub}>Salary breakdowns & disbursal receipts</Text>

      {MOCK_PAYSLIPS.map(ps => (
        <MobileCard key={ps.id}>
          <View style={styles.row}>
            <Text style={styles.month}>{ps.monthYear}</Text>
            <MobileBadge label={ps.status} variant="success" />
          </View>
          <Text style={styles.emp}>{ps.employeeName} ({ps.employeeCode})</Text>

          <View style={styles.breakdown}>
            <View style={styles.bRow}><Text style={styles.bText}>Gross Salary:</Text><Text style={styles.bVal}>₹{ps.grossSalary.toLocaleString('en-IN')}</Text></View>
            <View style={styles.bRow}><Text style={styles.bText}>Deductions (PF/TDS):</Text><Text style={[styles.bVal, { color: '#f87171' }]}>-₹{ps.totalDeductions.toLocaleString('en-IN')}</Text></View>
            <View style={[styles.bRow, { borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', paddingTop: 6, marginTop: 4 }]}>
              <Text style={[styles.bText, { fontWeight: '700', color: '#f9fafb' }]}>Net Take-Home:</Text>
              <Text style={[styles.bVal, { fontWeight: '700', color: '#34d399', fontSize: 16 }]}>₹{ps.netSalary.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <MobileButton title="Download PDF Payslip" variant="outline" onPress={() => alert('Downloading payslip PDF (UI Placeholder)')} />
        </MobileCard>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  sub: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { fontSize: 16, fontWeight: '700', color: '#f9fafb' },
  emp: { fontSize: 12, color: '#9ca3af', marginVertical: 4 },
  breakdown: { backgroundColor: '#1f2937', padding: 12, borderRadius: 8, marginVertical: 10 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  bText: { fontSize: 12, color: '#9ca3af' },
  bVal: { fontSize: 12, fontWeight: '600', color: '#f9fafb' }
});
