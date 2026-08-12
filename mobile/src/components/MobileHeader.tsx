import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserRole } from '@hrms/shared';

interface MobileHeaderProps {
  role: UserRole;
  onSwitchRole: (role: UserRole) => void;
  title: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ role, onSwitchRole, title }) => {
  const roles = [UserRole.EMPLOYEE, UserRole.EMPLOYER, UserRole.ADMIN];

  const nextRole = roles[(roles.indexOf(role) + 1) % roles.length];

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Role: {role}</Text>
      </View>
      <TouchableOpacity style={styles.roleBtn} onPress={() => onSwitchRole(nextRole)}>
        <Text style={styles.roleBtnText}>Role: {role} ⇄</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb'
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2
  },
  roleBtn: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  roleBtnText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600'
  }
});
