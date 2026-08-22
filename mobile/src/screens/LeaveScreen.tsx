import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MOCK_LEAVE_REQUESTS, UserRole } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import {
  fetchMobileLeaveRequests,
  fetchMobileLeaveBalances,
  applyMobileLeave,
  handleMobileLeaveAction,
} from '../services/api';

export const LeaveScreen: React.FC<{ role?: UserRole }> = ({ role = UserRole.ADMIN }) => {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadLeaveData = async () => {
    try {
      const [lvr, bal] = await Promise.all([
        fetchMobileLeaveRequests(),
        fetchMobileLeaveBalances(),
      ]);
      setLeaveRequests(lvr);
      setBalances(bal);
    } catch (err) {
      console.log('[LeaveScreen] Error loading live backend leave data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, []);

  const handleApplySubmit = async () => {
    if (!reason.trim()) {
      setFeedback('Please enter a reason for your leave.');
      return;
    }
    setSubmitting(true);
    setFeedback('Submitting leave request...');
    const res = await applyMobileLeave({
      leaveType,
      startDate,
      endDate,
      reason,
    });
    setSubmitting(false);

    if (res.success) {
      setFeedback('Leave request submitted successfully!');
      setTimeout(() => {
        setFeedback(null);
        setModalVisible(false);
        setReason('');
        loadLeaveData();
      }, 1500);
    } else {
      setFeedback(`Error: ${res.error || 'Failed to submit leave'}`);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const res = await handleMobileLeaveAction(id, action);
    if (res.success) {
      loadLeaveData();
    }
  };

  const pendingLeaves = leaveRequests.filter(
    (l) => l.overallStatus === 'PENDING' || l.status === 'PENDING'
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLeaveData(); }} colors={['#6366f1']} tintColor="#6366f1" />}
    >
      <Text style={styles.title}>Leave Management</Text>
      <Text style={styles.sub}>Track Leave Balances & Apply Requests</Text>

      {/* Leave Balances Grid */}
      <View style={styles.grid}>
        <MobileCard style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.balType}>Casual Leave (CL)</Text>
          <Text style={styles.balCount}>
            {balances?.casual?.remaining ?? 10} / {balances?.casual?.allocated ?? 12}
          </Text>
          <Text style={styles.balSub}>{balances?.casual?.used ?? 2} days used</Text>
        </MobileCard>

        <MobileCard style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.balType}>Privilege Leave (PL)</Text>
          <Text style={styles.balCount}>
            {balances?.privilege?.remaining ?? 12} / {balances?.privilege?.allocated ?? 15}
          </Text>
          <Text style={styles.balSub}>{balances?.privilege?.used ?? 3} days used</Text>
        </MobileCard>
      </View>

      {/* Button to Trigger Mobile Leave Form */}
      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => {
          setFeedback(null);
          setModalVisible(true);
        }}
      >
        <Text style={styles.applyBtnText}>+ Apply for New Leave</Text>
      </TouchableOpacity>

      {/* Pending Leave Requests (For Admin / Employer / Manager) */}
      {(role === UserRole.ADMIN || role === UserRole.EMPLOYER) && pendingLeaves.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Pending Approvals ({pendingLeaves.length})</Text>
          {pendingLeaves.map((lvr) => (
            <MobileCard key={lvr.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#f9fafb' }}>{lvr.employeeName}</Text>
                <MobileBadge label={lvr.leaveType || 'Leave'} variant="warning" />
              </View>
              <Text style={{ fontSize: 12, color: '#818cf8', marginTop: 4 }}>
                📅 {lvr.startDate} to {lvr.endDate} ({lvr.daysCount || lvr.totalDays} day)
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
          ))}
        </View>
      )}

      {/* Leave Application History */}
      <Text style={[styles.title, { fontSize: 16, marginTop: 16, marginBottom: 8 }]}>
        Leave Application History ({leaveRequests.length})
      </Text>
      {leaveRequests.length === 0 ? (
        <Text style={{ color: '#9ca3af', textAlign: 'center', marginVertical: 12 }}>No leave records found.</Text>
      ) : (
        leaveRequests.map((lvr) => (
          <MobileCard key={lvr.id} style={{ marginBottom: 8 }}>
            <View style={styles.row}>
              <Text style={styles.type}>{lvr.leaveType || 'Casual Leave'}</Text>
              <MobileBadge
                label={lvr.overallStatus || lvr.status || 'PENDING'}
                variant={
                  (lvr.overallStatus || lvr.status) === 'APPROVED'
                    ? 'success'
                    : (lvr.overallStatus || lvr.status) === 'PENDING'
                    ? 'warning'
                    : 'error'
                }
              />
            </View>
            <Text style={styles.emp}>{lvr.employeeName || 'Aarav Patel'} ({lvr.departmentName || 'Engineering'})</Text>
            <Text style={styles.dates}>📅 {lvr.startDate} to {lvr.endDate} ({lvr.daysCount || lvr.totalDays || 1} day)</Text>
            {lvr.reason ? <Text style={styles.reason}>"{lvr.reason}"</Text> : null}
          </MobileCard>
        ))
      )}

      {/* Apply Leave Modal Form */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#f9fafb' }}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#9ca3af', fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {feedback && (
              <View style={styles.feedbackBanner}>
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
            )}

            {/* Leave Type Selector */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {['Casual Leave', 'Privilege Leave', 'Sick Leave'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, leaveType === t ? styles.typePillActive : null]}
                  onPress={() => setLeaveType(t)}
                >
                  <Text style={[styles.typePillText, leaveType === t ? styles.typePillTextActive : null]}>{t.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Date */}
            <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-08-22"
              placeholderTextColor="#6b7280"
            />

            {/* End Date */}
            <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2026-08-22"
              placeholderTextColor="#6b7280"
            />

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason for Leave</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Describe your leave reason..."
              placeholderTextColor="#6b7280"
              multiline={true}
            />

            {/* Form Actions */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#374151', flex: 1 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#6366f1', flex: 2 }]}
                onPress={handleApplySubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  sub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  balType: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  balCount: { fontSize: 18, fontWeight: '800', color: '#6366f1', marginVertical: 4 },
  balSub: { fontSize: 11, color: '#6b7280' },
  applyBtn: { backgroundColor: '#6366f1', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  applyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#f9fafb', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 15, fontWeight: '700', color: '#f9fafb' },
  emp: { fontSize: 12, color: '#9ca3af', marginVertical: 2 },
  dates: { fontSize: 12, color: '#818cf8', fontWeight: '600', marginVertical: 2 },
  reason: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#374151' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111827', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#374151' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginBottom: 4 },
  input: { backgroundColor: '#1f2937', color: '#ffffff', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#374151', fontSize: 13 },
  typePill: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1f2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  typePillActive: { backgroundColor: '#4338ca', borderColor: '#6366f1' },
  typePillText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  typePillTextActive: { color: '#ffffff', fontWeight: '700' },
  feedbackBanner: { backgroundColor: '#312e81', padding: 8, borderRadius: 6, marginBottom: 12, alignItems: 'center' },
  feedbackText: { color: '#c7d2fe', fontSize: 12, fontWeight: '600' },
  modalBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
