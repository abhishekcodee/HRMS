import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  onLogout: () => void;
}

export function DashboardPlaceholderScreen({ onLogout }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, Employee</Text>
          <Text style={styles.roleTag}>Manager / Employee App Shell</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Biometric Attendance</Text>
          <Text style={styles.cardStatus}>eSSL Biometric Auto-Synced</Text>
          <Text style={styles.cardSub}>No manual check-in required</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Leave Applications</Text>
          <Text style={styles.cardStatus}>1-Stage Approval</Text>
          <Text style={styles.cardSub}>Manager OR HR/Admin</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Payslips & Salary</Text>
          <Text style={styles.cardStatus}>India Payroll (PF/ESI/TDS)</Text>
          <Text style={styles.cardSub}>View monthly breakdown</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  roleTag: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardStatus: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
