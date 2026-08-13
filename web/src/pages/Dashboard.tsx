import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { UserRole, MOCK_EMPLOYEES, MOCK_ATTENDANCE, MOCK_LEAVE_REQUESTS, MOCK_LEAVE_BALANCE } from '@hrms/shared';
import { StatCard, Card, CardHeader, CardTitle, CardBody, Badge, Button, Modal, TableContainer, Table, Thead, Tbody, Tr, Th, Td } from '../components/ui';
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Clock,
  UserPlus,
  CheckCircle2,
  TrendingUp,
  Plus,
  FileCheck2,
  ArrowRight,
  ShieldAlert,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { role, currentUser } = useRole();
  const navigate = useNavigate();
  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);

  // Stats Calculations from Mock Data
  const totalEmployees = MOCK_EMPLOYEES.length;
  const presentToday = MOCK_ATTENDANCE.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentToday = MOCK_ATTENDANCE.filter(a => a.status === 'ABSENT').length;
  const onLeave = MOCK_ATTENDANCE.filter(a => a.status === 'ON_LEAVE').length;
  const pendingLeaves = MOCK_LEAVE_REQUESTS.filter(l => l.status === 'PENDING').length;

  if (role === UserRole.EMPLOYEE) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Employee Self-Service Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--bg-sidebar) 0%, var(--bg-surface-hover) 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Welcome back, {currentUser.firstName}! 👋
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {currentUser.designation} • {currentUser.departmentName} ({currentUser.employeeId})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setApplyLeaveModalOpen(true)}>
              Apply Leave
            </Button>
            <Button variant="outline" icon={<CalendarDays size={16} />} onClick={() => navigate('/my-attendance')}>
              My Attendance
            </Button>
          </div>
        </div>

        {/* Employee Stats Grid */}
        <div className="stat-grid">
          <StatCard
            title="Today's Attendance"
            value="09:02 AM"
            icon={<Clock size={20} />}
            subtext="Check-in logged via Biometric"
            change="PRESENT"
            changeType="positive"
          />
          <StatCard
            title="Casual Leave Balance"
            value={`${MOCK_LEAVE_BALANCE.casualLeave.remaining} / ${MOCK_LEAVE_BALANCE.casualLeave.total}`}
            icon={<CalendarDays size={20} />}
            subtext={`${MOCK_LEAVE_BALANCE.casualLeave.used} days used this year`}
          />
          <StatCard
            title="Earned Leave Balance"
            value={`${MOCK_LEAVE_BALANCE.earnedLeave.remaining} / ${MOCK_LEAVE_BALANCE.earnedLeave.total}`}
            icon={<FileCheck2 size={20} />}
            subtext="Available for cashout/carryover"
          />
          <StatCard
            title="Company Attendance Rate"
            value="94.2%"
            icon={<TrendingUp size={20} />}
            subtext="Avg monthly compliance"
            change="+1.4%"
            changeType="positive"
          />
        </div>

        {/* Recent Leave & Attendance Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Leave Requests</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-leave')}>
                View All <ArrowRight size={14} />
              </Button>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Leave Type</Th>
                      <Th>Dates</Th>
                      <Th>Days</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {MOCK_LEAVE_REQUESTS.slice(0, 3).map(lvr => (
                      <Tr key={lvr.id}>
                        <Td style={{ fontWeight: 600 }}>{lvr.leaveType}</Td>
                        <Td>{lvr.startDate} to {lvr.endDate}</Td>
                        <Td>{lvr.totalDays} day(s)</Td>
                        <Td>
                          <Badge variant={lvr.status === 'APPROVED' ? 'success' : lvr.status === 'PENDING' ? 'warning' : 'error'}>
                            {lvr.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Attendance Log (This Month)</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-attendance')}>
                Full Calendar <ArrowRight size={14} />
              </Button>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>In</Th>
                      <Th>Out</Th>
                      <Th>Hours</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {MOCK_ATTENDANCE.slice(0, 4).map(att => (
                      <Tr key={att.id}>
                        <Td style={{ fontWeight: 600 }}>{att.date}</Td>
                        <Td>{att.checkIn}</Td>
                        <Td>{att.checkOut}</Td>
                        <Td>{att.workHours}</Td>
                        <Td>
                          <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'LATE' ? 'warning' : 'neutral'}>
                            {att.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        </div>

        {/* Apply Leave Modal */}
        <Modal isOpen={applyLeaveModalOpen} onClose={() => setApplyLeaveModalOpen(false)} title="Apply for Leave">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Leave Type *</label>
              <select className="select">
                <option value="Casual Leave">Casual Leave (9 days remaining)</option>
                <option value="Sick Leave">Sick Leave (5 days remaining)</option>
                <option value="Earned Leave">Earned Leave (11 days remaining)</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="input" defaultValue="2026-08-15" />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input type="date" className="input" defaultValue="2026-08-16" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <textarea className="textarea" rows={3} placeholder="Provide details for your leave request..."></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setApplyLeaveModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { setApplyLeaveModalOpen(false); alert('Leave application submitted (UI placeholder).'); }}>
                Submit Request
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Admin / HR / Manager View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner & Quick Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">HRMS Executive Dashboard</h1>
          <p className="page-subtitle">
            Single-Company Operational Overview • {role} Command Center
          </p>
        </div>
        <div className="page-actions">
          {(role === UserRole.ADMIN || role === UserRole.EMPLOYER) && (
            <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => navigate('/employees')}>
              + Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-grid">
        <StatCard
          title="Total Headcount"
          value={totalEmployees}
          icon={<Users size={20} />}
          subtext="Active company workforce"
          change="+2 this month"
          changeType="positive"
          onClick={() => navigate('/employees')}
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={<UserCheck size={20} />}
          subtext="Biometric punches logged"
          change="92% Rate"
          changeType="positive"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="Absent Today"
          value={absentToday}
          icon={<UserX size={20} />}
          subtext="No check-in recorded"
          change="2 Unexplained"
          changeType="negative"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="On Leave Today"
          value={onLeave}
          icon={<CalendarDays size={20} />}
          subtext="Approved leave status"
          change="1 Medical"
          changeType="neutral"
          onClick={() => navigate('/leave')}
        />
        <StatCard
          title="Pending Leave Requests"
          value={pendingLeaves}
          icon={<Clock size={20} />}
          subtext="Requires approval action"
          change="Action required"
          changeType="negative"
          onClick={() => navigate('/leave')}
        />
        <StatCard
          title="New Joiners (Aug)"
          value="3"
          icon={<UserPlus size={20} />}
          subtext="Completed onboarding"
          change="IT & HR"
          changeType="positive"
        />
        <StatCard
          title="Attendance Rate"
          value="94.2%"
          icon={<TrendingUp size={20} />}
          subtext="Avg monthly compliance"
          change="+1.4%"
          changeType="positive"
        />
      </div>

      {/* Charts Section (SVG Bar & Donut representation) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Attendance Trend Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
            <Badge variant="info">Live ZKTeco Sync</Badge>
          </CardHeader>
          <CardBody>
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', paddingTop: '1rem' }}>
              {[
                { day: 'Mon', count: 96, pct: '96%' },
                { day: 'Tue', count: 98, pct: '98%' },
                { day: 'Wed', count: 94, pct: '94%' },
                { day: 'Thu', count: 92, pct: '92%' },
                { day: 'Fri', count: 95, pct: '95%' },
                { day: 'Sat', count: 42, pct: '42%' },
                { day: 'Sun', count: 0, pct: '0%' }
              ].map(d => (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{d.pct}</span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: d.pct,
                      backgroundColor: d.count > 80 ? 'var(--primary-500)' : 'var(--bg-surface-hover)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Department Employee Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <Badge variant="neutral">5 Departments</Badge>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { dept: 'Information Technology', count: 24, pct: 40, color: 'var(--primary-500)' },
                { dept: 'Sales & Business', count: 15, pct: 25, color: 'var(--info-text)' },
                { dept: 'Operations & Facilities', count: 12, pct: 20, color: 'var(--warning-text)' },
                { dept: 'Human Resources', count: 8, pct: 15, color: 'var(--success-text)' }
              ].map(item => (
                <div key={item.dept}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.dept}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.count} employees ({item.pct}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.color, borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity Feeds */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        <Card>
          <CardHeader>
            <CardTitle>Pending Leave Approval Requests</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/leave')}>
              Manage All <ArrowRight size={14} />
            </Button>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Leave Type</Th>
                    <Th>Days</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {MOCK_LEAVE_REQUESTS.filter(l => l.status === 'PENDING').map(lvr => (
                    <Tr key={lvr.id}>
                      <Td style={{ fontWeight: 600 }}>{lvr.employeeName}</Td>
                      <Td>{lvr.leaveType}</Td>
                      <Td>{lvr.totalDays} day(s)</Td>
                      <Td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <Button variant="primary" size="sm" onClick={() => alert(`Approved leave for ${lvr.employeeName}`)}>
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => alert(`Rejected leave for ${lvr.employeeName}`)}>
                            Reject
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Exceptions (Today)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')}>
              View Logs <ArrowRight size={14} />
            </Button>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Check In</Th>
                    <Th>Exception</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {MOCK_ATTENDANCE.filter(a => a.status === 'LATE' || a.status === 'HALF_DAY' || a.status === 'MISSING_PUNCH').map(att => (
                    <Tr key={att.id}>
                      <Td style={{ fontWeight: 600 }}>{att.employeeName}</Td>
                      <Td>{att.checkIn}</Td>
                      <Td>
                        <Badge variant={att.status === 'LATE' ? 'warning' : 'error'}>
                          {att.status === 'LATE' ? `Late (${att.lateMinutes}m)` : att.status}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
