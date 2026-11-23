import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import {
  fetchRawBiometricLogs,
  formatDeviceTime,
  BiometricPunchLogRecord,
} from '../services/biometricApi';
import {
  Button,
  Card,
  SearchInput,
  Select,
  DatePicker,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Pagination,
  StatCard,
  Alert,
} from '../components/ui';
import { CalendarDays, Clock, Download, RefreshCw } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user, activeRoleView } = useAuth();
  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const [selectedDate, setSelectedDate] = useState(todayLocal);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logs, setLogs] = useState<BiometricPunchLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRawBiometricLogs({ date: selectedDate || undefined, limit: 2000 });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load biometric logs:', err);
      setError('Attendance logs could not be loaded. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Filter logs dynamically from real DB
  const filteredLogs = logs.filter((att) => {
    if (
      activeRoleView === UserRole.EMPLOYEE &&
      user?.employeeId &&
      att.employeeId !== user.employeeId
    ) {
      return false;
    }

    const matchesSearch =
      !search ||
      att.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      (att.employeeName && att.employeeName.toLowerCase().includes(search.toLowerCase())) ||
      att.deviceSn.toLowerCase().includes(search.toLowerCase());

    const matchesDate =
      !selectedDate || att.punchTime.startsWith(selectedDate);

    const isCheckIn = String(att.punchState ?? '0') === '0';
    const matchesStatus =
      !statusFilter || (statusFilter === 'CHECK_IN' ? isCheckIn : !isCheckIn);

    return matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Biometric Attendance Logs</h1>
          <p className="page-subtitle">
            {activeRoleView === UserRole.EMPLOYEE
              ? 'My Daily Hardware Biometric Punch Logs'
              : 'Real-Time eSSL Biometric Device Punch Log Ingestion'}
          </p>
        </div>
        <div className="page-actions">
          <Button
            variant="outline"
            icon={<RefreshCw size={16} />}
            onClick={loadLogs}
            isLoading={loading}
          >
            Refresh Feed
          </Button>
        </div>
      </div>

      {activeRoleView !== UserRole.EMPLOYEE && (
        <>
          {/* eSSL Integration Note Banner */}
          <Alert variant="info" title="Hardware eSSL Biometric Machine Real-Time Ingestion">
            Attendance punches are captured directly from hardware eSSL ZK-Teco biometric devices.
          </Alert>

          {/* Attendance Stats Cards */}
          <div className="stat-grid">
            <StatCard
              title="Total Machine Punches"
              value={logs.length}
              icon={<CalendarDays size={20} />}
              subtext="Hardware log entries in DB"
            />
            <StatCard
              title="Punched In Today"
              value={
                new Set(logs.filter((l) => l.punchTime.startsWith(todayLocal)).map((l) => l.devicePin)).size
              }
              icon={<Clock size={20} />}
              subtext="People with a punch today"
            />
            <StatCard
              title="Active Devices"
              value={
                new Set(logs.map((l) => l.deviceSn)).size
              }
              icon={<Clock size={20} />}
              subtext="Biometric hardware devices"
            />
          </div>
        </>
      )}

      {error && (
        <Alert variant="error" title="Unable to load attendance" onClose={() => setError(null)}>
          {error} <Button variant="outline" size="sm" onClick={loadLogs}>Try again</Button>
        </Alert>
      )}

      {/* Filter Toolbar */}
      <Card padding="1rem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <DatePicker
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <SearchInput
            placeholder="Search employee ID or Device SN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <Select
            placeholder="Filter by State"
            options={[
              { value: 'CHECK_IN', label: 'Check In' },
              { value: 'CHECK_OUT', label: 'Check Out' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Logs Table */}
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>Employee ID</Th>
              <Th>Employee Name</Th>
              <Th>Hardware Device SN</Th>
              <Th>Punch Date & Time</Th>
              <Th>Verification Method</Th>
              <Th>Punch Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredLogs.length === 0 ? (
              <Tr>
                <Td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No biometric punch logs found matching your filter criteria.
                </Td>
              </Tr>
            ) : (
              filteredLogs.map((att) => (
                <Tr key={att.id}>
                  <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{att.employeeId}</Td>
                  <Td style={{ fontWeight: 600 }}>
                    {att.matched ? att.employeeName : <Badge variant="warning">Device ID {att.devicePin} not linked</Badge>}
                  </Td>
                  <Td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{att.deviceSn}</Td>
                  <Td style={{ fontWeight: 600 }}>{formatDeviceTime(att.punchTime)}</Td>
                  <Td>{att.verifyType || 'Fingerprint / Face ID'}</Td>
                  <Td>
                    {String(att.punchState ?? '0') === '0' ? (
                      <Badge variant="success">CHECK IN</Badge>
                    ) : (
                      <Badge variant="warning">CHECK OUT</Badge>
                    )}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
        <Pagination
          currentPage={1}
          totalPages={1}
          totalItems={filteredLogs.length}
          itemsPerPage={10}
          onPageChange={() => {}}
        />
      </TableContainer>
    </div>
  );
};

export default AttendancePage;
