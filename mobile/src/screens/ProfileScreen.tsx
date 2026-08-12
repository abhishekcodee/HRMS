import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { UserRole, MOCK_EMPLOYEES } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { MobileButton } from '../components/MobileButton';

export const ProfileScreen: React.FC<{ role: UserRole; onSwitchRole: (role: UserRole) => void }> = ({ role, onSwitchRole }) => {
  const user = MOCK_EMPLOYEES[0];
  const roles = [UserRole.EMPLOYEE, UserRole.EMPLOYER, UserRole.ADMIN];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <MobileCard>
        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.desig}>{user.designation} • {user.employeeId}</Text>
        <View style={{ marginVertical: 8 }}>
          <MobileBadge label={`System Role: ${role}`} variant="info" />
        </View>
        <Text style={styles.detail}>Email: {user.email}</Text>
        <Text style={styles.detail}>Phone: {user.phone}</Text>
        <Text style={styles.detail}>Department: {user.departmentName}</Text>
        <Text style={styles.detail}>Joining Date: {user.joiningDate}</Text>
      </MobileCard>

      <Text style={styles.sectionTitle}>Role Inspection Switcher</Text>
      {roles.map(r => (
        <MobileButton
          key={r}
          title={`Switch to ${r} View`}
          variant={role === r ? 'primary' : 'outline'}
          onPress={() => onSwitchRole(r)}
        />
      ))}

      <View style={{ marginTop: 20 }}>
        <MobileButton title="Sign Out (Demo)" variant="danger" onPress={() => alert('Demo logout')} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  name: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  desig: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  detail: { fontSize: 13, color: '#9ca3af', marginVertical: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f9fafb', marginTop: 16, marginBottom: 8 }
});
