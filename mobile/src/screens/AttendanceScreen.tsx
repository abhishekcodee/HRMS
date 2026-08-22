import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { fetchMobileBiometricPunches } from '../services/api';

export const AttendanceScreen: React.FC = () => {
  const [punches, setPunches] = useState<any[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [checkInTime, setCheckInTime] = useState('09:02 AM');
  const [refreshing, setRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadPunches = async () => {
    const logs = await fetchMobileBiometricPunches();
    setPunches(logs);
    setRefreshing(false);
  };

  useEffect(() => {
    loadPunches();
  }, []);

  const handlePunchToggle = () => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isCheckedIn) {
      setIsCheckedIn(false);
      setStatusMsg(`Checked OUT at ${nowStr}`);
    } else {
      setIsCheckedIn(true);
      setCheckInTime(nowStr);
      setStatusMsg(`Checked IN at ${nowStr}`);
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPunches(); }} colors={['#10b981']} tintColor="#10b981" />}
    >
      <Text style={styles.title}>Biometric Attendance</Text>
      <Text style={styles.sub}>Live eSSL Machine Feed & Check-in Log</Text>

      {/* Quick Punch Status Card */}
      <MobileCard style={{ backgroundColor: '#064e3b', borderColor: '#059669', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#a7f3d0', textTransform: 'uppercase' }}>Today's Shift Status</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff', marginTop: 2 }}>
              {isCheckedIn ? 'ON TIME' : 'CHECKED OUT'}
            </Text>
            <Text style={{ fontSize: 12, color: '#6ee7b7', marginTop: 2 }}>
              {isCheckedIn ? `Check-in: ${checkInTime}` : 'Completed for today'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.punchBtn, { backgroundColor: isCheckedIn ? '#ef4444' : '#10b981' }]}
            onPress={handlePunchToggle}
          >
            <Text style={styles.punchBtnText}>{isCheckedIn ? 'Punch Out' : 'Punch In'}</Text>
          </TouchableOpacity>
        </View>
      </MobileCard>

      {statusMsg && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      )}

      {/* Attendance Metrics */}
      <View style={styles.grid}>
        <MobileCard style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.metricLabel}>Expected Staff</Text>
          <Text style={styles.metricValue}>18</Text>
          <Text style={styles.metricSub}>Active Shift</Text>
        </MobileCard>

        <MobileCard style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.metricLabel}>Present Today</Text>
          <Text style={styles.metricValue}>17</Text>
          <MobileBadge label="94% Rate" variant="success" />
        </MobileCard>
      </View>

      {/* Live eSSL Machine Punch Logs */}
      <Text style={[styles.title, { fontSize: 16, marginTop: 16, marginBottom: 8 }]}>
        Live Biometric Logs Feed ({punches.length})
      </Text>
      {punches.length === 0 ? (
        <MobileCard style={{ alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>No biometric hardware logs recorded today.</Text>
        </MobileCard>
      ) : (
        punches.map((p, idx) => (
          <MobileCard key={p.id || idx} style={{ marginBottom: 8 }}>
            <View style={styles.row}>
              <View>
                <Text style={styles.empName}>{p.employeeName || p.employeeId || 'Aarav Patel'}</Text>
                <Text style={styles.dept}>Device: {p.serialNumber || 'ESSL-K40-001'}</Text>
              </View>
              <MobileBadge
                label={p.status || 'ON TIME'}
                variant={p.status === 'LATE' ? 'warning' : 'success'}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Punch Time:</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#10b981', fontFamily: 'monospace' }}>
                {p.punchTime ? new Date(p.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '09:00:00 AM'}
              </Text>
            </View>
          </MobileCard>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  sub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  metricValue: { fontSize: 20, fontWeight: '800', color: '#f9fafb', marginVertical: 4 },
  metricSub: { fontSize: 11, color: '#6b7280' },
  punchBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  punchBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  statusBanner: { backgroundColor: '#065f46', padding: 8, borderRadius: 6, marginBottom: 12, alignItems: 'center' },
  statusText: { color: '#a7f3d0', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empName: { fontSize: 15, fontWeight: '700', color: '#f9fafb' },
  dept: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f2937' },
});
