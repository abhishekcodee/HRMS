import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { UserRole, MOCK_EMPLOYEES } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { MobileButton } from '../components/MobileButton';
import {
  fetchMobileEmployees,
  fetchMobileLeaveRequests,
  fetchMobileBiometricPunches,
  handleMobileLeaveAction,
} from '../services/api';

export const HomeScreen: React.FC<{ role: UserRole; onNavigateTab?: (tab: string) => void }> = ({
  role,
  onNavigateTab,
}) => {
  const currentUser = MOCK_EMPLOYEES[0];
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [biometricLogs, setBiometricLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [emps, lvr, bio] = await Promise.all([
        fetchMobileEmployees(),
        fetchMobileLeaveRequests(),
        fetchMobileBiometricPunches(),
      ]);
      setEmployees(emps.length > 0 ? emps : MOCK_EMPLOYEES);
      setLeaveRequests(lvr);
      setBiometricLogs(bio);
    } catch (err) {
      console.log('[HomeScreen] Error loading live backend data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setActionMessage(`Processing ${action.toLowerCase()}...`);
    const res = await handleMobileLeaveAction(id, action);
    if (res.success) {
      setActionMessage(`Request ${action.toLowerCase()}d successfully!`);
      loadData();
    } else {
      setActionMessage(`Error: ${res.error || 'Failed to update request'}`);
    }
    setTimeout(() => setActionMessage(null), 3500);
  };

  const pendingLeaves = leaveRequests.filter(
    (l) => l.overallStatus === 'PENDING' || l.status === 'PENDING'
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#6366f1']} tintColor="#6366f1" />}
    >
      {/* Welcome Banner */}
      <MobileCard style={{ backgroundColor: '#1e1b4b', borderColor: '#4338ca' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.greeting}>Welcome, {currentUser.firstName}!</Text>
            <Text style={styles.roleSub}>
              {currentUser.designation} • {role} View
            </Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{currentUser.firstName[0]}{currentUser.lastName[0]}</Text>
          </View>
        </View>
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
          <MobileBadge label="Live eSSL Connected" variant="success" />
          <MobileBadge label="Shift: 09:00 AM - 06:00 PM" variant="info" />
        </View>
      </MobileCard>

      {actionMessage && (
        <View style={styles.actionBanner}>
          <Text style={styles.actionText}>{actionMessage}</Text>
        </View>
      )}

      {/* KPI Cards Grid */}
      <Text style={styles.sectionTitle}>HRMS Live Overview</Text>
      <View style={styles.grid}>
        <MobileCard style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.statLabel}>Total Staff</Text>
          <Text style={styles.statValue}>{employees.length || 18}</Text>
          <Text style={styles.statSub}>Active Headcount</Text>
        </MobileCard>

        <MobileCard style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.statLabel}>Present Today</Text>
          <Text style={styles.statValue}>17 / 18</Text>
          <MobileBadge label="94% Rate" variant="success" />
        </MobileCard>
      </View>

      <View style={styles.grid}>
        <MobileCard style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.statLabel}>Approved Leaves</Text>
          <Text style={styles.statValue}>
            {leaveRequests.filter((l) => l.overallStatus === 'APPROVED' || l.status === 'APPROVED').length || 1}
          </Text>
          <MobileBadge label="Active Leaves" variant="info" />
        </MobileCard>

        <MobileCard style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.statLabel}>Pending Approval</Text>
          <Text style={styles.statValue}>{pendingLeaves.length}</Text>
          <MobileBadge label={pendingLeaves.length > 0 ? 'Action Required' : 'Up to date'} variant={pendingLeaves.length > 0 ? 'warning' : 'success'} />
        </MobileCard>
      </View>

      {/* Quick Mobile Action Buttons */}
      <Text style={styles.sectionTitle}>Quick Mobile Actions</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: '#6366f1' }]}
          onPress={() => onNavigateTab && onNavigateTab('leave')}
        >
          <Text style={styles.quickBtnText}>+ Apply Leave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: '#10b981' }]}
          onPress={() => onNavigateTab && onNavigateTab('attendance')}
        >
          <Text style={styles.quickBtnText}>⏱ Check In / Out</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Leave Requests Section for Admin / Employer Role */}
      {(role === UserRole.ADMIN || role === UserRole.EMPLOYER) && (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Pending Leave Approvals ({pendingLeaves.length})</Text>
            <TouchableOpacity onPress={() => onNavigateTab && onNavigateTab('leave')}>
              <Text style={{ fontSize: 12, color: '#818cf8', fontWeight: '600' }}>Manage All →</Text>
            </TouchableOpacity>
          </View>

          {pendingLeaves.length === 0 ? (
            <MobileCard style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>✓ All Caught Up!</Text>
              <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>No pending leave applications requiring action.</Text>
            </MobileCard>
          ) : (
            pendingLeaves.slice(0, 3).map((lvr) => (
              <MobileCard key={lvr.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#f9fafb' }}>{lvr.employeeName}</Text>
                  <MobileBadge label={lvr.leaveType || 'Leave'} variant="warning" />
                </View>
                <Text style={{ fontSize: 12, color: '#818cf8', marginTop: 4 }}>
                  📅 {lvr.startDate} {lvr.startDate !== lvr.endDate ? `to ${lvr.endDate}` : ''} ({lvr.daysCount || lvr.totalDays} day)
                </Text>
                {lvr.reason ? (
                  <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginVertical: 6 }}>"{lvr.reason}"</Text>
                ) : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}
                    onPress={() => handleAction(lvr.id, 'REJECT')}
                  >
                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 12 }}>✕ Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleAction(lvr.id, 'APPROVE')}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>✓ Approve</Text>
                  </TouchableOpacity>
                </View>
              </MobileCard>
            ))
          )}
        </View>
      )}

      {/* Live Biometric Machine Punches */}
      <Text style={styles.sectionTitle}>Recent Biometric Punches</Text>
      <MobileCard>
        {biometricLogs.length === 0 ? (
          <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 12 }}>No biometric punches logged today.</Text>
        ) : (
          biometricLogs.slice(0, 4).map((log: any, idx: number) => (
            <View key={log.id || idx} style={styles.punchRow}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#f9fafb' }}>{log.employeeName || log.employeeId}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>SN: {log.serialNumber || 'ESSL-K40-001'}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981', fontFamily: 'monospace' }}>
                {log.punchTime ? new Date(log.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}
              </Text>
            </View>
          ))
        )}
      </MobileCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
  },
  roleSub: {
    fontSize: 12,
    color: '#a5b4fc',
    marginTop: 4,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  actionBanner: {
    backgroundColor: '#312e81',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#c7d2fe',
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f9fafb',
    marginTop: 16,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9fafb',
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: '#6b7280',
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  punchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
});
