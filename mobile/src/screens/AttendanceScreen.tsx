import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MOCK_ATTENDANCE } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';

export const AttendanceScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Attendance & Punch Logs</Text>
      <Text style={styles.sub}>Biometric terminal automated sync log</Text>

      {MOCK_ATTENDANCE.map(att => (
        <MobileCard key={att.id}>
          <View style={styles.row}>
            <Text style={styles.name}>{att.employeeName}</Text>
            <MobileBadge
              label={att.status}
              variant={att.status === 'PRESENT' ? 'success' : att.status === 'LATE' ? 'warning' : 'neutral'}
            />
          </View>
          <Text style={styles.dept}>{att.departmentName} • {att.employeeCode}</Text>
          <View style={styles.punchRow}>
            <Text style={styles.punch}>In: {att.checkIn}</Text>
            <Text style={styles.punch}>Out: {att.checkOut}</Text>
            <Text style={styles.punch}>Hours: {att.workHours}</Text>
          </View>
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
  name: { fontSize: 16, fontWeight: '600', color: '#f9fafb' },
  dept: { fontSize: 12, color: '#6b7280', marginVertical: 4 },
  punchRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  punch: { fontSize: 12, color: '#9ca3af', fontWeight: '500' }
});
