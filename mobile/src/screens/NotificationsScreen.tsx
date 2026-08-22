import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import {
  fetchMobileNotifications,
  markMobileNotificationRead,
  clearAllMobileNotifications,
} from '../services/api';

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    const data = await fetchMobileNotifications();
    setNotifications(data);
    setRefreshing(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    await markMobileNotificationRead();
    loadNotifications();
  };

  const handleClearAll = async () => {
    await clearAllMobileNotifications();
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} colors={['#6366f1']} tintColor="#6366f1" />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={styles.title}>Notifications Center</Text>
        <MobileBadge label={`${unreadCount} Unread`} variant={unreadCount > 0 ? 'warning' : 'success'} />
      </View>
      <Text style={styles.sub}>Company Announcements & System Alerts</Text>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleMarkAllRead}>
          <Text style={styles.actionBtnText}>✓ Mark All Read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]} onPress={handleClearAll}>
          <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑 Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <MobileCard style={{ alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 14 }}>🔔 Notifications Clear</Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>No notifications or system alerts at this time.</Text>
        </MobileCard>
      ) : (
        notifications.map((n) => (
          <MobileCard
            key={n.id}
            style={{
              marginBottom: 8,
              borderLeftWidth: 4,
              borderLeftColor: !n.read ? '#6366f1' : '#374151',
              backgroundColor: !n.read ? '#1e1b4b' : '#111827',
            }}
          >
            <View style={styles.row}>
              <Text style={styles.notifTitle}>{n.title || 'System Notification'}</Text>
              <MobileBadge label={n.read ? 'READ' : 'NEW'} variant={n.read ? 'neutral' : 'warning'} />
            </View>
            <Text style={styles.notifMsg}>{n.message}</Text>
            <Text style={styles.notifTime}>
              {n.timestamp ? new Date(n.timestamp).toLocaleString() : 'Just now'}
            </Text>
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
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#f9fafb' },
  notifMsg: { fontSize: 12, color: '#9ca3af', marginVertical: 4, lineHeight: 16 },
  notifTime: { fontSize: 11, color: '#6b7280', marginTop: 4 },
});
