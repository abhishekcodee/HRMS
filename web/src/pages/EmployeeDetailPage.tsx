import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import {
  fetchEmployeeByIdFromDb,
  updateEmployeeInDb,
  fetchEmployeeAttendanceById,
  EmployeeDbRecord,
  EmployeeAttendanceData,
} from '../services/employeeApi';
import {
  fetchEmployeeLeaveBalances,
  allocateEmployeeLeaveInDb,
  fetchEmployeeLeaveHistory,
  EmployeeLeaveSummary,
  LeaveRecord,
} from '../services/leaveApi';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Tabs,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Breadcrumbs,
  Modal,
  Input,
  Select,
  Alert,
} from '../components/ui';
import { ArrowLeft, ShieldCheck, Edit3, CheckCircle2, Camera, Upload, SlidersHorizontal, Calendar, Clock, CheckCircle, XCircle, FileText, FileCheck, Download, Plus } from 'lucide-react';
import { AppointmentLetterBuilderModal } from '../components/documents/AppointmentLetterBuilderModal';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, activeRoleView, updateUserProfileInState } = useAuth();

  const targetId = id || user?.id;

  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeDbRecord | null>(null);

  // Leave System State
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [leaveSummary, setLeaveSummary] = useState<EmployeeLeaveSummary | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Leave Allocation Modal State
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [allocForm, setAllocForm] = useState<Record<string, number>>({});
  const [allocating, setAllocating] = useState(false);

  // Leave History State
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Attendance State
  const [attendanceMode, setAttendanceMode] = useState<'weekly' | 'monthly'>('weekly');
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceData | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Appointment Letters State
  const [appointmentLetterBuilderOpen, setAppointmentLetterBuilderOpen] = useState(false);
  const [appointmentLetters, setAppointmentLetters] = useState<any[]>([]);
  const [loadingApptLetters, setLoadingApptLetters] = useState(false);

  const loadAppointmentLetters = async () => {
    if (!targetId) return;
    setLoadingApptLetters(true);
    try {
      const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
      const res = await fetch(`/api/v1/appointment-letters/employee/${targetId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const json = await res.json();
      if (json.success) {
        setAppointmentLetters(json.data || []);
      }
    } catch (err) {
      console.error('Error loading appointment letters:', err);
    } finally {
      setLoadingApptLetters(false);
    }
  };

  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    profilePhoto: '',
  });

  const loadProfileFromDb = async () => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchEmployeeByIdFromDb(targetId);
      if (data) {
        setEmployee(data);
        setEditForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          address: data.address || '',
          emergencyContact: data.emergencyContact || '',
          emergencyPhone: data.emergencyPhone || '',
          profilePhoto: data.profilePhoto || '',
        });
      } else {
        setEmployee(null);
      }
    } catch (err) {
      console.error('Failed to load employee profile from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveBalances = async () => {
    if (!targetId) return;
    setLoadingBalances(true);
    try {
      const data = await fetchEmployeeLeaveBalances(targetId, selectedYear);
      setLeaveSummary(data);
      if (data && data.leaveTypes) {
        const initialForm: Record<string, number> = {};
        data.leaveTypes.forEach((t) => {
          initialForm[t.leaveType] = t.allocated;
        });
        setAllocForm(initialForm);
      }
    } catch (err) {
      console.error('Failed to load employee leave balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const loadLeaveHistory = async () => {
    if (!targetId) return;
    setLoadingHistory(true);
    try {
      const history = await fetchEmployeeLeaveHistory(targetId, {
        year: selectedYear,
        leaveType: historyTypeFilter,
        status: historyStatusFilter,
      });
      setLeaveHistory(history);
    } catch (err) {
      console.error('Failed to load employee leave history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAttendance = async () => {
    if (!targetId) return;
    setLoadingAttendance(true);
    const data = await fetchEmployeeAttendanceById(targetId, attendanceMode);
    setAttendanceData(data);
    setLoadingAttendance(false);
  };

  useEffect(() => {
    loadProfileFromDb();
  }, [targetId]);

  useEffect(() => {
    loadLeaveBalances();
    loadLeaveHistory();
  }, [targetId, selectedYear, historyTypeFilter, historyStatusFilter]);

  useEffect(() => {
    loadAttendance();
  }, [targetId, attendanceMode]);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadAppointmentLetters();
    }
  }, [targetId, activeTab]);

  // Handle Photo File Upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorToast('Image size must be under 5MB.');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Url = reader.result as string;
      setEditForm((prev) => ({ ...prev, profilePhoto: base64Url }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    const res = await updateEmployeeInDb(employee.id, {
      fullName: editForm.fullName,
      phone: editForm.phone,
      address: editForm.address,
      emergencyContact: editForm.emergencyContact,
      emergencyPhone: editForm.emergencyPhone,
      profilePhoto: editForm.profilePhoto,
    });

    if (res.success) {
      if (user?.id === employee.id) {
        updateUserProfileInState({
          fullName: editForm.fullName,
          profilePhoto: editForm.profilePhoto,
        });
      }
      setEditModalOpen(false);
      setSuccessToast('Profile details and profile picture updated successfully!');
      setTimeout(() => setSuccessToast(null), 4000);
      await loadProfileFromDb();
    } else {
      setErrorToast(res.error || 'Failed to update profile.');
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  // Submit Leave Allocations
  const handleSaveLeaveAllocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setAllocating(true);
    const allocationsArray = Object.entries(allocForm).map(([leaveType, allocatedDays]) => ({
      leaveType,
      allocatedDays: Number(allocatedDays),
    }));

    const res = await allocateEmployeeLeaveInDb({
      userId: employee.id,
      year: selectedYear,
      allocations: allocationsArray,
    });

    setAllocating(false);
    if (res.success) {
      setAllocateModalOpen(false);
      setSuccessToast(res.message || `Leave allocation saved for ${employee.fullName} (${selectedYear})`);
      setTimeout(() => setSuccessToast(null), 4000);
      await loadLeaveBalances();
    } else {
      setErrorToast(res.error || 'Failed to save leave allocation.');
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  if (loading) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading profile details...</p>
      </Card>
    );
  }

  if (!employee) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Employee Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No matching employee profile record was found.</p>
        <Button variant="primary" onClick={() => navigate('/employees')}>
          Back to Employee Directory
        </Button>
      </Card>
    );
  }

  const isOwnProfile = user?.id === employee.id;
  const isAdminOrEmployer = activeRoleView === UserRole.ADMIN || activeRoleView === UserRole.EMPLOYER;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs
        items={[
          { label: 'Employees', href: '/employees' },
          { label: employee.fullName },
        ]}
      />

      {successToast && (
        <Alert variant="success" title="System Action Saved">
          {successToast}
        </Alert>
      )}

      {errorToast && (
        <Alert variant="error" title="Error">
          {errorToast}
        </Alert>
      )}

      {/* Profile Header Banner */}
      <Card style={{ padding: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={employee.fullName} src={employee.profilePhoto} size="xl" status="online" />
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                title="Change Profile Picture"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  backgroundColor: 'var(--primary-500)',
                  color: '#fff',
                  border: '2px solid var(--bg-card)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                }}
              >
                <Camera size={16} />
              </button>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {employee.fullName}
                </h1>
                <Badge variant={employee.status === 'active' ? 'success' : 'neutral'}>
                  {employee.status ? employee.status.toUpperCase() : 'ACTIVE'}
                </Badge>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {employee.designation || 'Employee'} •{' '}
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{employee.employeeId}</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {employee.departmentName || 'General Department'} ({employee.role})
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {activeRoleView !== UserRole.EMPLOYEE && (
              <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => navigate('/employees')}>
                Back to Directory
              </Button>
            )}
            {isOwnProfile && (
              <Button variant="secondary" icon={<ShieldCheck size={16} />} onClick={() => navigate('/change-password')}>
                Change Password
              </Button>
            )}
            <Button variant="primary" icon={<Edit3 size={16} />} onClick={() => setEditModalOpen(true)}>
              Edit Profile & Photo
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview & Personal' },
          { id: 'attendance', label: 'Attendance Logs' },
          { id: 'employment', label: 'Employment Details' },
          { id: 'documents', label: 'Documents' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Personal Details & Emergency Contact Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Gender:</span> <strong>{employee.gender || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span> <strong>{employee.dob || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{employee.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{employee.phone || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Gross Salary (Monthly):</span>{' '}
                    <strong style={{ color: '#10b981' }}>₹{employee.salary ? Number(employee.salary).toLocaleString() : '—'}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '0.65rem', marginTop: '0.2rem' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Residential Address</span>
                    <div style={{ marginTop: '0.25rem' }}>
                      <strong>{employee.residentialAddress || employee.address || '—'}</strong>
                    </div>
                    {(employee.residentialCity || employee.residentialState || employee.residentialPincode) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        {[employee.residentialCity, employee.residentialState, employee.residentialPincode].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '0.65rem' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      Permanent Address {employee.permanentAddressSame ? '(Same as Residential)' : ''}
                    </span>
                    <div style={{ marginTop: '0.25rem' }}>
                      <strong>{employee.permanentAddressSame ? (employee.residentialAddress || employee.address || '—') : (employee.permanentAddress || '—')}</strong>
                    </div>
                    {(employee.permanentAddressSame ? (employee.residentialCity || employee.residentialState || employee.residentialPincode) : (employee.permanentCity || employee.permanentState || employee.permanentPincode)) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                        {employee.permanentAddressSame
                          ? [employee.residentialCity, employee.residentialState, employee.residentialPincode].filter(Boolean).join(', ')
                          : [employee.permanentCity, employee.permanentState, employee.permanentPincode].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Contact Person:</span> <strong>{employee.emergencyContact || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Emergency Phone:</span> <strong>{employee.emergencyPhone || '—'}</strong>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ==================== LEAVE BALANCE SECTION ==================== */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <CardTitle>Leave Balance — {selectedYear}</CardTitle>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Leave metrics for {employee.fullName} ({employee.employeeId})
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '120px' }}>
                    <Select
                      value={selectedYear.toString()}
                      options={[
                        { value: '2026', label: '2026' },
                        { value: '2025', label: '2025' },
                        { value: '2027', label: '2027' },
                      ]}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    />
                  </div>

                  {isAdminOrEmployer && (
                    <Button
                      variant="primary"
                      icon={<SlidersHorizontal size={16} />}
                      onClick={() => setAllocateModalOpen(true)}
                    >
                      Manage Leave Balance
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info-text)', textTransform: 'uppercase' }}>Total Allocated</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {leaveSummary ? leaveSummary.summary.totalAllocated : 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error-text)', textTransform: 'uppercase' }}>Used / Approved</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {leaveSummary ? leaveSummary.summary.totalUsed : 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning-text)', textTransform: 'uppercase' }}>Pending Approval</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {leaveSummary ? leaveSummary.summary.totalPending : 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-text)', textTransform: 'uppercase' }}>Remaining Balance</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-text)', marginTop: '0.25rem' }}>
                    {leaveSummary ? leaveSummary.summary.totalRemaining : 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>
              </div>

              {/* Leave Type Balance Table */}
              <TableContainer style={{ marginTop: '0.5rem' }}>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Leave Type</Th>
                      <Th style={{ textAlign: 'center' }}>Allocated</Th>
                      <Th style={{ textAlign: 'center' }}>Used</Th>
                      <Th style={{ textAlign: 'center' }}>Pending</Th>
                      <Th style={{ textAlign: 'center' }}>Remaining</Th>
                      <Th style={{ width: '220px' }}>Usage Progress</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {loadingBalances ? (
                      <Tr>
                        <Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Calculating leave balances...
                        </Td>
                      </Tr>
                    ) : !leaveSummary || leaveSummary.leaveTypes.length === 0 ? (
                      <Tr>
                        <Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No leave balance records found for year {selectedYear}.
                        </Td>
                      </Tr>
                    ) : (
                      leaveSummary.leaveTypes.map((item) => {
                        const pct = item.allocated > 0 ? Math.min(100, Math.round((item.used / item.allocated) * 100)) : 0;
                        const barColor = pct >= 90 ? 'var(--error-text)' : pct >= 70 ? 'var(--warning-text)' : 'var(--primary-500)';

                        return (
                          <Tr key={item.leaveType}>
                            <Td style={{ fontWeight: 600 }}>
                              {item.leaveType} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>({item.code})</span>
                            </Td>
                            <Td style={{ textAlign: 'center', fontWeight: 700 }}>{item.allocated}</Td>
                            <Td style={{ textAlign: 'center', color: 'var(--error-text)', fontWeight: 600 }}>{item.used}</Td>
                            <Td style={{ textAlign: 'center', color: 'var(--warning-text)', fontWeight: 600 }}>{item.pending}</Td>
                            <Td style={{ textAlign: 'center', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.95rem' }}>
                              {item.remaining}
                            </Td>
                            <Td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                                  <span>{item.used} / {item.allocated} Days</span>
                                  <span>{pct}% Used</span>
                                </div>
                                <div style={{ height: '7px', width: '100%', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                </div>
                              </div>
                            </Td>
                          </Tr>
                        );
                      })
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>

          {/* ==================== LEAVE HISTORY SECTION ==================== */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info-text)' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <CardTitle>Leave Application History ({selectedYear})</CardTitle>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Complete records for {employee.fullName}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '180px' }}>
                    <Select
                      value={historyTypeFilter}
                      options={[
                        { value: 'ALL', label: 'All Leave Types' },
                        { value: 'Casual Leave', label: 'Casual Leave' },
                        { value: 'Sick Leave', label: 'Sick Leave' },
                        { value: 'Earned Leave', label: 'Earned Leave' },
                        { value: 'Privilege Leave', label: 'Privilege Leave' },
                        { value: 'Paid Leave', label: 'Paid Leave' },
                        { value: 'Unpaid Leave (LWP)', label: 'Unpaid Leave (LWP)' },
                      ]}
                      onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    />
                  </div>

                  <div style={{ width: '150px' }}>
                    <Select
                      value={historyStatusFilter}
                      options={[
                        { value: 'ALL', label: 'All Statuses' },
                        { value: 'APPROVED', label: 'Approved' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'REJECTED', label: 'Rejected' },
                        { value: 'CANCELLED', label: 'Cancelled' },
                      ]}
                      onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardBody>
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Leave Type</Th>
                      <Th>From Date</Th>
                      <Th>To Date</Th>
                      <Th style={{ textAlign: 'center' }}>Days</Th>
                      <Th>Reason</Th>
                      <Th>Applied On</Th>
                      <Th style={{ textAlign: 'right' }}>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {loadingHistory ? (
                      <Tr>
                        <Td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Fetching leave history...
                        </Td>
                      </Tr>
                    ) : leaveHistory.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No leave applications recorded for the selected filter criteria.
                        </Td>
                      </Tr>
                    ) : (
                      leaveHistory.map((item) => (
                        <Tr key={item.id}>
                          <Td style={{ fontWeight: 600 }}>{item.leaveType}</Td>
                          <Td>{item.startDate}</Td>
                          <Td>{item.endDate}</Td>
                          <Td style={{ textAlign: 'center', fontWeight: 700 }}>{item.daysCount}</Td>
                          <Td style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.reason || '—'}
                          </Td>
                          <Td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</Td>
                          <Td style={{ textAlign: 'right' }}>
                            <Badge
                              variant={
                                item.status === 'APPROVED'
                                  ? 'success'
                                  : item.status === 'PENDING'
                                  ? 'warning'
                                  : item.status === 'REJECTED'
                                  ? 'error'
                                  : 'neutral'
                              }
                            >
                              {item.status}
                            </Badge>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <CardTitle>Attendance Records ({attendanceMode === 'weekly' ? 'Weekly View' : 'Monthly View'})</CardTitle>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Attendance metrics for {employee.fullName} ({employee.employeeId})
                    </p>
                  </div>
                </div>

                <div style={{ width: '220px' }}>
                  <Select
                    value={attendanceMode}
                    options={[
                      { value: 'weekly', label: 'Weekly (Last 7 Days)' },
                      { value: 'monthly', label: 'Monthly (Last 30 Days)' },
                    ]}
                    onChange={(e) => setAttendanceMode(e.target.value as 'weekly' | 'monthly')}
                  />
                </div>
              </div>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-text)', textTransform: 'uppercase' }}>Present Days</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-text)', marginTop: '0.25rem' }}>
                    {attendanceData?.summary.presentDays || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {attendanceData?.summary.totalDays || 0} Days</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning-text)', textTransform: 'uppercase' }}>Late Days</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {attendanceData?.summary.lateDays || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error-text)', textTransform: 'uppercase' }}>Absent Days</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {attendanceData?.summary.absentDays || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info-text)', textTransform: 'uppercase' }}>Avg Work Hours</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {attendanceData?.summary.avgWorkHours || '0.0'} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Hrs/Day</span>
                  </div>
                </div>
              </div>

              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Work Date</Th>
                      <Th>Clock In</Th>
                      <Th>Clock Out</Th>
                      <Th style={{ textAlign: 'center' }}>Work Hours</Th>
                      <Th style={{ textAlign: 'right' }}>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {loadingAttendance ? (
                      <Tr>
                        <Td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Fetching attendance records...
                        </Td>
                      </Tr>
                    ) : !attendanceData || attendanceData.logs.length === 0 ? (
                      <Tr>
                        <Td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No attendance logs recorded for this period.
                        </Td>
                      </Tr>
                    ) : (
                      attendanceData.logs.map((log) => (
                        <Tr key={log.id}>
                          <Td style={{ fontWeight: 600 }}>{log.workDate}</Td>
                          <Td>{log.clockIn || '—'}</Td>
                          <Td>{log.clockOut || '—'}</Td>
                          <Td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {log.workHours !== undefined ? `${log.workHours} hrs` : '—'}
                          </Td>
                          <Td style={{ textAlign: 'right' }}>
                            <Badge
                              variant={
                                log.status === 'PRESENT'
                                  ? 'success'
                                  : log.status === 'LATE'
                                  ? 'warning'
                                  : 'error'
                              }
                            >
                              {log.status}
                            </Badge>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'employment' && (
        <Card>
          <CardHeader>
            <CardTitle>Organization & Master Allocation</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <div>
                  <strong>{employee.departmentName || 'General'}</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Designation:</span>
                <div>
                  <strong>{employee.designation || 'Employee'}</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Branch Location:</span>
                <div>
                  <strong>{employee.branchName || 'Corporate HQ'}</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Shift:</span>
                <div>
                  <strong>{employee.shiftName || 'General Day Shift'}</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date of Joining:</span>
                <div>
                  <strong>{employee.joiningDate || '—'}</strong>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>System Role:</span>
                <div>
                  <Badge variant="info">{employee.role}</Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Appointment Letter Action Header Card */}
          <Card>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
                  <FileCheck size={22} />
                </div>
                <div>
                  <CardTitle>Corporate Appointment Letters</CardTitle>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Generate, customize, version, and manage official appointment letters for {employee.fullName}
                  </p>
                </div>
              </div>

              {isAdminOrEmployer && (
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setAppointmentLetterBuilderOpen(true)}
                >
                  + Generate Appointment Letter
                </Button>
              )}
            </CardHeader>

            <CardBody>
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Document / Reference</Th>
                      <Th>Version</Th>
                      <Th>Generated Date</Th>
                      <Th>Annual CTC</Th>
                      <Th>Status</Th>
                      <Th style={{ textAlign: 'right' }}>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {loadingApptLetters ? (
                      <Tr>
                        <Td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Loading appointment letter history...
                        </Td>
                      </Tr>
                    ) : appointmentLetters.length === 0 ? (
                      <Tr>
                        <Td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          No appointment letters generated for this employee yet. Click <strong>"+ Generate Appointment Letter"</strong> above to launch the builder.
                        </Td>
                      </Tr>
                    ) : (
                      appointmentLetters.map((doc) => (
                        <Tr key={doc.id}>
                          <Td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <FileText size={18} style={{ color: 'var(--primary-500)' }} />
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>Official Appointment Letter</strong>
                                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  Ref: {doc.referenceNumber}
                                </div>
                              </div>
                            </div>
                          </Td>
                          <Td>
                            <Badge variant="info">Version {doc.versionNumber}</Badge>
                          </Td>
                          <Td style={{ fontWeight: 500 }}>{doc.generatedDate}</Td>
                          <Td style={{ fontWeight: 700, color: 'var(--success-text)' }}>
                            ₹{doc.annualCtc ? Number(doc.annualCtc).toLocaleString('en-IN') : '—'}
                          </Td>
                          <Td>
                            <Badge variant={doc.status === 'SIGNED' ? 'success' : 'neutral'}>
                              {doc.status || 'GENERATED'}
                            </Badge>
                          </Td>
                          <Td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<FileText size={14} />}
                                onClick={() => setAppointmentLetterBuilderOpen(true)}
                              >
                                View / Edit
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Download size={14} />}
                                onClick={() => alert(`Downloading Appointment Letter PDF ${doc.referenceNumber}`)}
                              >
                                Download
                              </Button>
                            </div>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Edit Profile & Photo Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Employee Profile & Photo">
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Profile Picture Uploader */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
            <Avatar name={editForm.fullName || employee.fullName} src={editForm.profilePhoto} size="xl" />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label
                className="btn btn-outline"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
              >
                <Upload size={14} /> Upload New Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Or Image URL
              </label>
              <Input
                placeholder="https://example.com/avatar.jpg"
                value={editForm.profilePhoto}
                onChange={(e) => setEditForm({ ...editForm, profilePhoto: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Full Name *
            </label>
            <Input
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Phone Number
            </label>
            <Input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Residential Address
            </label>
            <Input
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Emergency Contact Name
              </label>
              <Input
                value={editForm.emergencyContact}
                onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Emergency Phone
              </label>
              <Input
                value={editForm.emergencyPhone}
                onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<CheckCircle2 size={16} />}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage / Allocate Leave Modal */}
      <Modal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        title={`Allocate Leave — ${employee.fullName} (${employee.employeeId || 'ID'})`}
        maxWidth="540px"
      >
        <form onSubmit={handleSaveLeaveAllocations} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <strong>Employee:</strong> {employee.fullName} • <strong>ID:</strong> {employee.employeeId} • <strong>Year:</strong> {selectedYear}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Set Allocated Days Per Leave Type
            </label>

            {leaveSummary?.leaveTypes.map((item) => (
              <div
                key={item.leaveType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {item.leaveType} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.code})</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Currently Used: {item.used} Days
                  </div>
                </div>

                <div style={{ width: '100px' }}>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={allocForm[item.leaveType] !== undefined ? allocForm[item.leaveType] : item.allocated}
                    onChange={(e) =>
                      setAllocForm({
                        ...allocForm,
                        [item.leaveType]: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={allocating}>
              {allocating ? 'Saving Allocation...' : 'Save Allocation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Appointment Letter Builder & Live A4 Preview Modal */}
      {targetId && (
        <AppointmentLetterBuilderModal
          isOpen={appointmentLetterBuilderOpen}
          onClose={() => setAppointmentLetterBuilderOpen(false)}
          employeeId={targetId}
          onSuccess={() => loadAppointmentLetters()}
        />
      )}
    </div>
  );
};

export default EmployeeDetailPage;
