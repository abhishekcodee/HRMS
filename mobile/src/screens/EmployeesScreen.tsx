import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { MOCK_EMPLOYEES } from '@hrms/shared';
import { MobileCard } from '../components/MobileCard';
import { MobileBadge } from '../components/MobileBadge';
import { fetchMobileEmployees } from '../services/api';

export const EmployeesScreen: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const loadEmployees = async () => {
    const emps = await fetchMobileEmployees();
    setEmployees(emps.length > 0 ? emps : MOCK_EMPLOYEES);
    setRefreshing(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = ['All', 'Software Engineering', 'Human Resources', 'Operations & Logistics', 'Finance & Accounts', 'Sales & Business'];

  const filtered = employees.filter((emp) => {
    const matchSearch =
      (emp.firstName + ' ' + emp.lastName + ' ' + (emp.designation || '') + ' ' + (emp.employeeId || '')).toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || (emp.departmentName || emp.dept || '').includes(deptFilter.split(' ')[0]);
    return matchSearch && matchDept;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEmployees(); }} colors={['#6366f1']} tintColor="#6366f1" />}
    >
      <Text style={styles.title}>Employee Directory</Text>
      <Text style={styles.sub}>Staff Roster & Contact Information ({filtered.length})</Text>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search name, designation, ID..."
        placeholderTextColor="#6b7280"
        value={search}
        onChangeText={setSearch}
      />

      {/* Department Filter Pills */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {departments.map((dept) => (
          <TouchableOpacity
            key={dept}
            style={[styles.deptPill, deptFilter === dept ? styles.deptPillActive : null]}
            onPress={() => setDeptFilter(dept)}
          >
            <Text style={[styles.deptPillText, deptFilter === dept ? styles.deptPillTextActive : null]}>
              {dept.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Employee List */}
      {filtered.length === 0 ? (
        <Text style={{ color: '#9ca3af', textAlign: 'center', marginVertical: 20 }}>No employees match search filter.</Text>
      ) : (
        filtered.map((emp) => {
          const initials = (emp.firstName ? emp.firstName[0] : 'E') + (emp.lastName ? emp.lastName[0] : 'M');
          return (
            <MobileCard key={emp.id || emp.employeeId} style={{ marginBottom: 10 }}>
              <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.empName}>{emp.firstName} {emp.lastName}</Text>
                    <Text style={styles.designation}>{emp.designation || 'Staff Member'}</Text>
                    <Text style={styles.deptText}>🏢 {emp.departmentName || 'Operations'}</Text>
                  </View>
                </View>
                <MobileBadge
                  label={emp.status || 'ACTIVE'}
                  variant={emp.status === 'ACTIVE' ? 'success' : 'neutral'}
                />
              </View>

              <View style={styles.contactRow}>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>✉️ {emp.email || 'employee@hrms.com'}</Text>
                <Text style={{ fontSize: 12, color: '#818cf8', fontWeight: '600' }}>📞 {emp.phone || '+91 98765 00000'}</Text>
              </View>
            </MobileCard>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  title: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  sub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  searchInput: { backgroundColor: '#1f2937', color: '#ffffff', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#374151', fontSize: 13 },
  deptPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1f2937', marginRight: 6, borderWidth: 1, borderColor: '#374151' },
  deptPillActive: { backgroundColor: '#4338ca', borderColor: '#6366f1' },
  deptPillText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  deptPillTextActive: { color: '#ffffff', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  empName: { fontSize: 15, fontWeight: '700', color: '#f9fafb' },
  designation: { fontSize: 12, color: '#818cf8', fontWeight: '600', marginTop: 1 },
  deptText: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f2937' },
});
