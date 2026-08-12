import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { UserRole, MOCK_ATTENDANCE, MOCK_DEPARTMENTS, AttendanceMock } from '@hrms/shared';
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
  Alert
} from '../components/ui';
import { CalendarDays, Clock, ShieldCheck, Download, Filter } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { role, currentUser } = useRole();
  const [selectedDate, setSelectedDate] = useState('2026-08-11');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = MOCK_ATTENDANCE.filter(att => {
    if (role === UserRole.EMPLOYEE && att.employeeCode !== currentUser.employeeId) {
      return false;
    }
    const matchesSearch =
      att.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      att.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? att.departmentName === deptFilter : true;
    const matchesStatus = statusFilter ? att.status === statusFilter : true;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Biometric Attendance Logs</h1>
          <p className="page-subtitle">
            {role === UserRole.EMPLOYEE ? 'My Daily Punch & Work Hours Log' : 'Automated ZKTeco Ingestion & Daily Work Duration Processing'}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" icon={<Download size={16} />} onClick={() => alert('Exporting attendance report (UI Placeholder).')}>
            Export CSV
          </Button>
        </div>
      </div>

      {role !== UserRole.EMPLOYEE && (
        <>
          {/* ZKTeco Integration Note Banner */}
          <Alert variant="info" title="ZKTeco Biometric Device Automated Sync Enabled">
            Attendance punches are automatically captured from physical biometric terminal IP endpoints. Manual employee check-in creation is prohibited as per compliance policy.
          </Alert>

          {/* Attendance Stats Cards */}
          <div className="stat-grid">
            <StatCard title="Total Scheduled" value={MOCK_ATTENDANCE.length} icon={<CalendarDays size={20} />} subtext="Today's workforce shift" />
            <StatCard title="Punched In" value={MOCK_ATTENDANCE.filter(a => a.checkIn !== '-').length} icon={<Clock size={20} />} change="92%" changeType="positive" />
            <StatCard title="Late Arrivals" value={MOCK_ATTENDANCE.filter(a => a.status === 'LATE').length} icon={<Clock size={20} />} change="2 Employees" changeType="negative" />
            <StatCard title="Missing Punch" value={MOCK_ATTENDANCE.filter(a => a.status === 'MISSING_PUNCH').length} icon={<Clock size={20} />} change="1 Exception" changeType="negative" />
          </div>
        </>
      )}

      {/* Filter Toolbar */}
      <Card padding="1rem">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <DatePicker value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <SearchInput placeholder="Search employee or ID..." value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} />
          <Select
            placeholder="All Departments"
            options={MOCK_DEPARTMENTS.map(d => ({ value: d.name, label: d.name }))}
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          />
          <Select
            placeholder="All Statuses"
            options={[
              { value: 'PRESENT', label: 'Present' },
              { value: 'LATE', label: 'Late' },
              { value: 'HALF_DAY', label: 'Half Day' },
              { value: 'ON_LEAVE', label: 'On Leave' },
              { value: 'MISSING_PUNCH', label: 'Missing Punch' }
            ]}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Logs Table */}
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>Employee</Th>
              <Th>ID</Th>
              <Th>Department</Th>
              <Th>Date</Th>
              <Th>Check In</Th>
              <Th>Check Out</Th>
              <Th>Work Hours</Th>
              <Th>Late / Early</Th>
              <Th>Overtime</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredLogs.map(att => (
              <Tr key={att.id}>
                <Td style={{ fontWeight: 600 }}>{att.employeeName}</Td>
                <Td style={{ fontFamily: 'monospace' }}>{att.employeeCode}</Td>
                <Td>{att.departmentName}</Td>
                <Td>{att.date}</Td>
                <Td style={{ fontWeight: 600, color: att.checkIn !== '-' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{att.checkIn}</Td>
                <Td style={{ fontWeight: 600, color: att.checkOut !== '-' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{att.checkOut}</Td>
                <Td>{att.workHours}</Td>
                <Td>
                  {att.lateMinutes > 0 ? (
                    <span style={{ color: 'var(--warning-text)', fontWeight: 600 }}>+{att.lateMinutes}m Late</span>
                  ) : att.earlyExitMinutes > 0 ? (
                    <span style={{ color: 'var(--error-text)', fontWeight: 600 }}>-{att.earlyExitMinutes}m Early</span>
                  ) : (
                    'On Time'
                  )}
                </Td>
                <Td>{att.overtimeHours}</Td>
                <Td>
                  <Badge
                    variant={
                      att.status === 'PRESENT'
                        ? 'success'
                        : att.status === 'LATE'
                        ? 'warning'
                        : att.status === 'MISSING_PUNCH'
                        ? 'error'
                        : 'neutral'
                    }
                  >
                    {att.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Pagination currentPage={1} totalPages={1} totalItems={filteredLogs.length} itemsPerPage={10} onPageChange={() => {}} />
      </TableContainer>
    </div>
  );
};

export default AttendancePage;
