import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image
          source={require('../../assets/hrms-brand.png')}
          style={{ width: 120, height: 36, resizeMode: 'contain' }}
        />
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{role}</Text>
        </View>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  roleBtn: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  roleBtnText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '600',
  },
});
