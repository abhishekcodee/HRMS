import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserRole } from '@hrms/shared';

interface MobileBottomNavProps {
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  role,
  activeTab,
  onTabChange,
}) => {
  const getTabs = () => {
    switch (role) {
      case UserRole.EMPLOYEE:
        return [
          { id: 'home', label: 'Home', icon: '🏠' },
          { id: 'attendance', label: 'Attendance', icon: '⏱' },
          { id: 'leave', label: 'Leave', icon: '📝' },
          { id: 'notifications', label: 'Alerts', icon: '🔔' },
          { id: 'profile', label: 'Profile', icon: '👤' },
        ];
      case UserRole.EMPLOYER:
      case UserRole.ADMIN:
      default:
        return [
          { id: 'home', label: 'Home', icon: '🏠' },
          { id: 'employees', label: 'Employees', icon: '👥' },
          { id: 'attendance', label: 'Attendance', icon: '⏱' },
          { id: 'leave', label: 'Leave', icon: '📝' },
          { id: 'notifications', label: 'Alerts', icon: '🔔' },
          { id: 'profile', label: 'More', icon: '⚙️' },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={{ fontSize: 18 }}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 64,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#6366f1',
    fontWeight: '700',
  },
});
