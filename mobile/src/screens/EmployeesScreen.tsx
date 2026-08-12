import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MOCK_EMPLOYEES } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';

export const EmployeesScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Employee Directory</Text>
      <Text style={styles.sub}>{MOCK_EMPLOYEES.length} Active Team Members</Text>

      {MOCK_EMPLOYEES.map(emp => (
        <MobileCard key={emp.id}>
          <View style={styles.row}>
            <View>
              <Text style={styles.name}>{emp.firstName} {emp.lastName}</Text>
              <Text style={styles.desig}>{emp.designation}</Text>
            </View>
            <MobileBadge label={emp.status} variant={emp.status === 'ACTIVE' ? 'success' : 'warning'} />
          </View>
          <View style={styles.details}>
            <Text style={styles.detailText}>ID: {emp.employeeId}</Text>
            <Text style={styles.detailText}>Dept: {emp.departmentName}</Text>
            <Text style={styles.detailText}>Email: {emp.email}</Text>
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
  name: { fontSize: 16, fontWeight: '700', color: '#f9fafb' },
  desig: { fontSize: 12, color: '#6366f1', marginTop: 2 },
  details: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  detailText: { fontSize: 12, color: '#9ca3af', marginVertical: 2 }
});
