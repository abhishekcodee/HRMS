import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { UserRole, MOCK_EMPLOYEES, MOCK_ATTENDANCE, MOCK_LEAVE_REQUESTS, MOCK_PAYSLIPS } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { MobileButton } from '../components/MobileButton';

export const HomeScreen: React.FC<{ role: UserRole }> = ({ role }) => {
  const currentUser = MOCK_EMPLOYEES[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Banner */}
      <MobileCard style={{ backgroundColor: '#1f2937' }}>
        <Text style={styles.greeting}>Welcome, {currentUser.firstName}!</Text>
        <Text style={styles.roleSub}>{currentUser.designation} • {role} View</Text>
        <View style={{ marginTop: 12 }}>
          <MobileBadge label={`Biometric Check-in: 09:02 AM`} variant="success" />
        </View>
      </MobileCard>

      {/* KPI Cards Grid */}
      <Text style={styles.sectionTitle}>Overview Statistics</Text>
      <View style={styles.grid}>
        <MobileCard style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.statLabel}>Total Headcount</Text>
          <Text style={styles.statValue}>{MOCK_EMPLOYEES.length}</Text>
          <Text style={styles.statSub}>Active headcount</Text>
        </MobileCard>
        <MobileCard style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.statLabel}>Present Today</Text>
          <Text style={styles.statValue}>{MOCK_ATTENDANCE.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length}</Text>
          <Text style={styles.statSub}>92% Compliance</Text>
        </MobileCard>
      </View>

      <View style={styles.grid}>
        <MobileCard style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.statLabel}>On Leave</Text>
          <Text style={styles.statValue}>{MOCK_ATTENDANCE.filter(a => a.status === 'ON_LEAVE').length}</Text>
          <MobileBadge label="Approved" variant="info" />
        </MobileCard>
        <MobileCard style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.statLabel}>Pending Leaves</Text>
          <Text style={styles.statValue}>{MOCK_LEAVE_REQUESTS.filter(l => l.status === 'PENDING').length}</Text>
          <MobileBadge label="Requires Action" variant="warning" />
        </MobileCard>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Mobile Actions</Text>
      <MobileButton title="+ Apply for Leave" onPress={() => alert('Mobile Apply Leave (UI Placeholder)')} />
      <MobileButton title="View July 2026 Payslip" variant="secondary" onPress={() => alert('Viewing Payslip (UI Placeholder)')} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19'
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb'
  },
  roleSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f9fafb',
    marginTop: 16,
    marginBottom: 8
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
    marginVertical: 4
  },
  statSub: {
    fontSize: 11,
    color: '#6b7280'
  }
});
