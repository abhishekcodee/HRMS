import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { UserRole, MOCK_EMPLOYEES } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';

export const ProfileScreen: React.FC<{
  role: UserRole;
  onSwitchRole: (role: UserRole) => void;
}> = ({ role, onSwitchRole }) => {
  const currentUser = MOCK_EMPLOYEES[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Employee Profile</Text>
      <Text style={styles.sub}>Account Info & Role Management</Text>

      {/* Main Profile Card */}
      <MobileCard style={{ alignItems: 'center', padding: 20 }}>
        <View style={styles.largeAvatar}>
          <Text style={styles.avatarText}>{currentUser.firstName[0]}{currentUser.lastName[0]}</Text>
        </View>
        <Text style={styles.name}>{currentUser.firstName} {currentUser.lastName}</Text>
        <Text style={styles.designation}>{currentUser.designation}</Text>
        <View style={{ marginTop: 8 }}>
          <MobileBadge label={`ID: ${currentUser.employeeId}`} variant="info" />
        </View>
      </MobileCard>

      {/* Role View Switcher */}
      <Text style={styles.sectionTitle}>Switch Role View</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {[UserRole.ADMIN, UserRole.EMPLOYER, UserRole.EMPLOYEE].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rolePill, role === r ? styles.rolePillActive : null]}
            onPress={() => onSwitchRole(r)}
          >
            <Text style={[styles.rolePillText, role === r ? styles.rolePillTextActive : null]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Employment Details */}
      <Text style={styles.sectionTitle}>Employment Details</Text>
      <MobileCard style={{ marginBottom: 12 }}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Department</Text>
          <Text style={styles.detailValue}>{currentUser.departmentName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Team</Text>
          <Text style={styles.detailValue}>{currentUser.teamName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Joining Date</Text>
          <Text style={styles.detailValue}>{currentUser.joiningDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <MobileBadge label={currentUser.status} variant="success" />
        </View>
      </MobileCard>

      {/* Contact & Emergency */}
      <Text style={styles.sectionTitle}>Contact & Emergency</Text>
      <MobileCard style={{ marginBottom: 16 }}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{currentUser.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{currentUser.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Emergency Contact</Text>
          <Text style={styles.detailValue}>{currentUser.emergencyContact} ({currentUser.emergencyPhone})</Text>
        </View>
      </MobileCard>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => alert('Mobile session logout complete.')}
      >
        <Text style={styles.logoutBtnText}>🔒 Logout from HRMS Mobile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  sub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  largeAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 22 },
  name: { fontSize: 18, fontWeight: '700', color: '#f9fafb' },
  designation: { fontSize: 13, color: '#818cf8', fontWeight: '600', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#f9fafb', marginBottom: 8 },
  rolePill: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1f2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  rolePillActive: { backgroundColor: '#4338ca', borderColor: '#6366f1' },
  rolePillText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  rolePillTextActive: { color: '#ffffff', fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  detailLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  detailValue: { fontSize: 12, color: '#f9fafb', fontWeight: '600' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  logoutBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});
