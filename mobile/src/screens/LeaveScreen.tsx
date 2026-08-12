import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MOCK_LEAVE_REQUESTS } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { MobileButton } from '../components/MobileButton';

export const LeaveScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Leave Management</Text>
      <Text style={styles.sub}>Track & Apply Leave Applications</Text>

      <MobileButton title="+ Apply for Leave" onPress={() => alert('Apply Leave Modal (UI Placeholder)')} />

      <Text style={[styles.title, { fontSize: 16, marginTop: 16 }]}>Leave Requests History</Text>
      {MOCK_LEAVE_REQUESTS.map(lvr => (
        <MobileCard key={lvr.id}>
          <View style={styles.row}>
            <Text style={styles.type}>{lvr.leaveType}</Text>
            <MobileBadge label={lvr.status} variant={lvr.status === 'APPROVED' ? 'success' : lvr.status === 'PENDING' ? 'warning' : 'error'} />
          </View>
          <Text style={styles.emp}>{lvr.employeeName} ({lvr.departmentName})</Text>
          <Text style={styles.dates}>{lvr.startDate} to {lvr.endDate} ({lvr.totalDays} days)</Text>
          <Text style={styles.reason}>{lvr.reason}</Text>
        </MobileCard>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  sub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 16, fontWeight: '600', color: '#f9fafb' },
  emp: { fontSize: 12, color: '#9ca3af', marginVertical: 2 },
  dates: { fontSize: 12, color: '#6366f1', fontWeight: '600', marginVertical: 2 },
  reason: { fontSize: 12, color: '#6b7280', marginTop: 4 }
});
