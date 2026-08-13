import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { UserRole } from '@hrms/shared';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomNav } from './components/MobileBottomNav';

import { HomeScreen } from './screens/HomeScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { LeaveScreen } from './screens/LeaveScreen';
import { EmployeesScreen } from './screens/EmployeesScreen';
import { ProfileScreen } from './screens/ProfileScreen';

export default function App() {
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [activeTab, setActiveTab] = useState<string>('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen role={role} />;
      case 'attendance':
        return <AttendanceScreen />;
      case 'leave':
        return <LeaveScreen />;
      case 'employees':
        return <EmployeesScreen />;
      case 'profile':
      default:
        return <ProfileScreen role={role} onSwitchRole={setRole} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <MobileHeader role={role} onSwitchRole={setRole} title="HRMS Mobile" />
      <View style={styles.content}>{renderScreen()}</View>
      <MobileBottomNav role={role} activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19'
  },
  content: {
    flex: 1
  }
});
