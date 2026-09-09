import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { UserRole } from '@hrms/shared';
import {
  fetchLeaveRequests,
  fetchLeaveBalances,
  fetchLeaveLedger,
  applyLeaveInDb,
  employerActionInDb,
  adminActionInDb,
  calculateCLPLDuration,
  fetchPLCalculationDetails,
  LeaveRecord,
  LeaveBalanceRecord,
  LeaveLedgerRecord,
} from '../services/leaveApi';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  StatCard,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  Input,
  Select,
  Alert,
} from '../components/ui';
import {
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  Building2,
  Paperclip,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ListFilter,
  Calculator,
} from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { user, activeRoleView } = useAuth();
  const { addNotification } = useNotifications();
  const [requests, setRequests] = useState<LeaveRecord[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [mainViewMode, setMainViewMode] = useState<'DIRECTORY' | 'LEDGER'>('DIRECTORY');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetActionRole, setTargetActionRole] = useState<'EMPLOYER' | 'ADMIN'>('EMPLOYER');
  const [viewingLeave, setViewingLeave] = useState<LeaveRecord | null>(null);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [plFormulaModalOpen, setPlFormulaModalOpen] = useState(false);
  const [plCalcData, setPlCalcData] = useState<any>(null);
  const [loadingPlCalc, setLoadingPlCalc] = useState(false);

  const handleOpenPlFormula = async () => {
    setPlFormulaModalOpen(true);
    setLoadingPlCalc(true);
    try {
      const data = await fetchPLCalculationDetails({ userId: user?.id });
      if (data) setPlCalcData(data);
    } catch (err) {
      console.error('Failed to load PL formula breakdown:', err);
    } finally {
      setLoadingPlCalc(false);
    }
  };

  const [form, setForm] = useState({
    leaveType: 'CL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    attachment: '',
  });

  // Calculate days count dynamically using CL & PL half-day/full-day business rule
  const calculatedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 1;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (start > end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const raw = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return calculateCLPLDuration(raw, form.leaveType);
  }, [form.startDate, form.endDate, form.leaveType]);

  // Compute Dynamic Server-side CL Summary (Strict Integer Values)
  const clSummary = useMemo(() => {
    const item = balances.find((b) => b.leaveType === 'CL' || b.leaveType.includes('Casual'));
    const allocated = item?.allocatedDays !== undefined && item?.allocatedDays !== null ? calculateCLPLDuration(parseFloat(String(item.allocatedDays))) : 0;
    const used = calculateCLPLDuration(parseFloat(String(item?.usedDays || '0')));
    const pending = calculateCLPLDuration(parseFloat(String(item?.pendingDays || '0')));
    const remaining = item?.remainingDays !== undefined && item?.remainingDays !== null ? calculateCLPLDuration(parseFloat(String(item.remainingDays))) : Math.max(0, allocated - used - pending);
    return { allocated, used, pending, remaining: Math.max(0, remaining) };
  }, [balances]);

  // Compute Dynamic Server-side PL Summary (Strict Integer Values)
  const plSummary = useMemo(() => {
    const item = balances.find((b) => b.leaveType === 'PL' || b.leaveType.includes('Privilege') || b.leaveType.includes('Earned'));
    const allocated = item?.allocatedDays !== undefined && item?.allocatedDays !== null ? calculateCLPLDuration(parseFloat(String(item.allocatedDays))) : 0;
    const used = calculateCLPLDuration(parseFloat(String(item?.usedDays || '0')));
    const pending = calculateCLPLDuration(parseFloat(String(item?.pendingDays || '0')));
    const remaining = item?.remainingDays !== undefined && item?.remainingDays !== null ? calculateCLPLDuration(parseFloat(String(item.remainingDays))) : Math.max(0, allocated - used - pending);
    return { allocated, used, pending, remaining: Math.max(0, remaining) };
  }, [balances]);

  // Available remaining balance for selected type in modal
  const currentAvailableBalance = useMemo(() => {
    const norm = form.leaveType.toUpperCase();
    return norm.includes('PL') || norm.includes('PRIVILEGE') ? plSummary.remaining : clSummary.remaining;
  }, [form.leaveType, clSummary, plSummary]);

  const loadLeaveData = async () => {
    setLoading(true);
    try {
      const [reqData, balData, ledgerData] = await Promise.all([
        fetchLeaveRequests({
          status: activeTab !== 'ALL' ? activeTab : undefined,
          view: activeRoleView ? activeRoleView.toLowerCase() : undefined,
        }),
        fetchLeaveBalances(),
        fetchLeaveLedger(),
      ]);
      setRequests(reqData);
      setBalances(balData);
      setLedger(ledgerData);
    } catch (err) {
      console.error('Failed to load leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, [activeTab, activeRoleView]);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedDays <= 0) {
      setToastMessage({ type: 'error', text: 'End Date must be after or equal to Start Date.' });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    if (calculatedDays > currentAvailableBalance) {
      setToastMessage({
        type: 'error',
        text: `Insufficient balance for ${form.leaveType}. Requested: ${calculatedDays} day(s), Available Remaining: ${currentAvailableBalance} day(s).`,
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    setSubmitting(true);
    const res = await applyLeaveInDb({
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      daysCount: calculatedDays,
      reason: form.reason,
      attachment: form.attachment ? form.attachment.trim() : undefined,
    });

    setSubmitting(false);
    if (res.success) {
      addNotification({
        type: 'LEAVE',
        title: 'Leave Application Submitted',
        message: `Your ${form.leaveType} request (${calculatedDays} day(s)) has been submitted for Dual Approval.`,
        link: '/my-leave',
      });
      setToastMessage({
        type: 'success',
        text: 'Leave request submitted successfully! Routed for Dual Approval.',
      });
      setApplyModalOpen(false);
      setForm({
        leaveType: 'CL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        attachment: '',
      });
      await loadLeaveData();
      setTimeout(() => setToastMessage(null), 5000);
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to submit leave request.' });
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Employer / Manager Action
  const handleEmployerAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT') {
      setSelectedLeaveId(id);
      setTargetActionRole('EMPLOYER');
      setRejectionRemarks('');
      setRejectModalOpen(true);
      return;
    }

    const res = await employerActionInDb(id, 'APPROVE');
    if (res.success) {
      setToastMessage({ type: 'success', text: res.message || 'Employer approval recorded successfully.' });
      await loadLeaveData();
      if (viewingLeave && viewingLeave.id === id) {
        setViewingLeave(null);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to record employer action.' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Admin Action
  const handleAdminAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT') {
      setSelectedLeaveId(id);
      setTargetActionRole('ADMIN');
      setRejectionRemarks('');
      setRejectModalOpen(true);
      return;
    }

    const res = await adminActionInDb(id, 'APPROVE');
    if (res.success) {
      setToastMessage({ type: 'success', text: res.message || 'Admin approval recorded successfully.' });
      await loadLeaveData();
      if (viewingLeave && viewingLeave.id === id) {
        setViewingLeave(null);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to record admin action.' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveId) return;

    setSubmitting(true);
    const res =
      targetActionRole === 'EMPLOYER'
        ? await employerActionInDb(selectedLeaveId, 'REJECT', rejectionRemarks)
        : await adminActionInDb(selectedLeaveId, 'REJECT', rejectionRemarks);

    setSubmitting(false);

    if (res.success) {
      setToastMessage({ type: 'success', text: res.message || 'Rejection recorded and employee notified.' });
      setRejectModalOpen(false);
      setSelectedLeaveId(null);
      await loadLeaveData();
      if (viewingLeave && viewingLeave.id === selectedLeaveId) {
        setViewingLeave(null);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to record rejection.' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">
            {activeRoleView === UserRole.EMPLOYEE
              ? 'Dynamic CL & PL Entitlement & Leave Ledger'
              : activeRoleView === UserRole.EMPLOYER
              ? 'Employer & Manager Leave Review Dashboard'
              : 'Admin System-Wide Leave Governance & Final Approval'}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setApplyModalOpen(true)}>
            + Apply for Leave
          </Button>
        </div>
      </div>

      {toastMessage && (
        <Alert variant={toastMessage.type === 'success' ? 'success' : 'danger'} title="Notification">
          {toastMessage.text}
        </Alert>
      )}

      {/* CL & PL Dynamic Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Casual Leave (CL) Card */}
        <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Casual Leave (CL)
              </h3>
            </div>
            <Badge variant={clSummary.remaining > 0 ? 'success' : 'error'}>{clSummary.remaining} Days Remaining</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Allocated</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{clSummary.allocated}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Used</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444', marginTop: '0.2rem' }}>{clSummary.used}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pending</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.2rem' }}>{clSummary.pending}</div>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.2rem' }}>{clSummary.remaining}</div>
            </div>
          </div>
        </Card>

        {/* Privilege Leave (PL) Card */}
        <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Privilege Leave (PL)
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Badge variant={plSummary.remaining > 0 ? 'success' : 'error'}>{plSummary.remaining} Days Remaining</Badge>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Allocated</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{plSummary.allocated}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Used</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444', marginTop: '0.2rem' }}>{plSummary.used}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pending</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.2rem' }}>{plSummary.pending}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.65rem 0.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>{plSummary.remaining}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main View Mode Navigation Bar (Requests Directory vs Leave Ledger) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn ${mainViewMode === 'DIRECTORY' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setMainViewMode('DIRECTORY')}
          >
            <ListFilter size={16} /> Leave Applications Directory ({requests.length})
          </button>
          <button
            className={`btn ${mainViewMode === 'LEDGER' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setMainViewMode('LEDGER')}
          >
            <BookOpen size={16} /> Leave Ledger (Audit Trail)
          </button>
        </div>

        {mainViewMode === 'DIRECTORY' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className={`btn ${activeTab === 'ALL' ? 'btn-outline' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('ALL')}
            >
              All ({requests.length})
            </button>
            <button
              className={`btn ${activeTab === 'PENDING' ? 'btn-outline' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('PENDING')}
            >
              Pending ({pendingCount})
            </button>
            <button
              className={`btn ${activeTab === 'APPROVED' ? 'btn-outline' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('APPROVED')}
            >
              Approved ({approvedCount})
            </button>
            <button
              className={`btn ${activeTab === 'REJECTED' ? 'btn-outline' : 'btn-ghost'} btn-sm`}
              onClick={() => setActiveTab('REJECTED')}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        )}
      </div>

      {mainViewMode === 'LEDGER' ? (
        /* Leave Ledger Table View */
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="#3b82f6" /> Complete Leave Transaction Ledger
            </CardTitle>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Transaction Date</Th>
                    <Th>Leave Type</Th>
                    <Th>Transaction Type</Th>
                    <Th style={{ textAlign: 'right' }}>Credit (+)</Th>
                    <Th style={{ textAlign: 'right' }}>Debit (-)</Th>
                    <Th style={{ textAlign: 'right' }}>Balance</Th>
                    <Th>Remarks</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {ledger.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No transactions recorded in leave ledger yet.
                      </Td>
                    </Tr>
                  ) : (
                    ledger.map((item) => (
                      <Tr key={item.id}>
                        <Td style={{ fontWeight: 600 }}>{item.transactionDate || item.createdAt.split('T')[0]}</Td>
                        <Td>
                          <Badge variant={item.leaveType === 'CL' ? 'info' : 'success'}>
                            {item.leaveType}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.transactionType}</Td>
                        <Td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                          {parseFloat(String(item.credit)) > 0 ? `+${item.credit}` : '-'}
                        </Td>
                        <Td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                          {parseFloat(String(item.debit)) > 0 ? `-${item.debit}` : '-'}
                        </Td>
                        <Td style={{ textAlign: 'right', fontWeight: 700 }}>{item.balance}</Td>
                        <Td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.remarks || '-'}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      ) : (
        /* Main Leave Requests Table */
        <Card>
          <CardHeader>
            <CardTitle>
              {activeRoleView === UserRole.EMPLOYEE
                ? 'My Leave Applications'
                : activeRoleView === UserRole.EMPLOYER
                ? 'Employer / Manager Review Queue'
                : 'Admin Leave Applications Directory'} ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave records from database...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No leave applications found for selected filter.</div>
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Leave Type</Th>
                    <Th>Dates</Th>
                    <Th>Days</Th>
                    <Th>Employer Status</Th>
                    <Th>Admin Status</Th>
                    <Th>Overall Status</Th>
                    <Th style={{ textAlign: 'right' }}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {requests.map((lvr) => {
                    const isSelf = user?.id === lvr.userId;
                    const empStatus = lvr.employerStatus || 'PENDING';
                    const admStatus = lvr.adminStatus || 'PENDING';
                    const overall = lvr.status || 'PENDING';

                    return (
                      <Tr key={lvr.id}>
                        <Td style={{ fontWeight: 600 }}>
                          {lvr.employeeName || 'Self'}
                          {lvr.employeeId && (
                            <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {lvr.employeeId} ({lvr.departmentName || 'General'})
                            </span>
                          )}
                        </Td>
                        <Td>
                          <Badge variant="info">{lvr.leaveType}</Badge>
                        </Td>
                        <Td style={{ whiteSpace: 'nowrap' }}>
                          {lvr.startDate} to {lvr.endDate}
                        </Td>
                        <Td style={{ fontWeight: 600 }}>{lvr.daysCount} day(s)</Td>

                        {/* Employer Approval Status Badge */}
                        <Td>
                          <Badge variant={empStatus === 'APPROVED' ? 'success' : empStatus === 'PENDING' ? 'warning' : 'error'}>
                            Employer: {empStatus}
                          </Badge>
                        </Td>

                        {/* Admin Approval Status Badge */}
                        <Td>
                          <Badge variant={admStatus === 'APPROVED' ? 'success' : admStatus === 'PENDING' ? 'warning' : 'error'}>
                            Admin: {admStatus}
                          </Badge>
                        </Td>

                        {/* Overall Dual Approval Status Badge */}
                        <Td>
                          <Badge variant={overall === 'APPROVED' ? 'success' : overall === 'PENDING' ? 'warning' : 'error'}>
                            {overall}
                          </Badge>
                        </Td>

                        <Td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', alignItems: 'center' }}>
                            <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setViewingLeave(lvr)}>
                              View
                            </Button>

                            {/* Employer Action Controls */}
                            {activeRoleView === UserRole.EMPLOYER && overall === 'PENDING' && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot approve your own leave' : 'Approve as Employer'}
                                  onClick={() => handleEmployerAction(lvr.id, 'APPROVE')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot reject your own leave' : 'Reject as Employer'}
                                  onClick={() => handleEmployerAction(lvr.id, 'REJECT')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {/* Admin Action Controls */}
                            {activeRoleView === UserRole.ADMIN && overall === 'PENDING' && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot approve your own leave' : 'Approve as Admin'}
                                  onClick={() => handleAdminAction(lvr.id, 'APPROVE')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot reject your own leave' : 'Reject as Admin'}
                                  onClick={() => handleAdminAction(lvr.id, 'REJECT')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Leave Type *"
            required
            options={[
              { value: 'CL', label: 'CL – Casual Leave' },
              { value: 'PL', label: 'PL – Privilege Leave' },
            ]}
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="From Date *"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label="To Date *"
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          {/* Auto-Calculated Days & Balance Information */}
          <div
            style={{
              background: 'var(--bg-app)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
              <strong>{calculatedDays} Day(s)</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Available Balance: </span>
              <strong style={{ color: currentAvailableBalance >= calculatedDays ? '#10b981' : '#ef4444' }}>
                {currentAvailableBalance} day(s)
              </strong>
            </div>
          </div>

          {calculatedDays > currentAvailableBalance && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={16} /> Leave duration exceeds your available balance for {form.leaveType}.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Reason / Description *</label>
            <textarea
              className="textarea"
              rows={3}
              required
              placeholder="Provide reason for leave request..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <Input
            label="Optional Attachment URL / Document Reference"
            placeholder="e.g. /documents/medical_certificate.pdf"
            value={form.attachment}
            onChange={(e) => setForm({ ...form, attachment: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting} disabled={calculatedDays > currentAvailableBalance || calculatedDays <= 0}>
              Submit Request for Dual Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rejection Remarks Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title={`Reject Leave Request (${targetActionRole})`}>
        <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            State reason for rejection as <strong>{targetActionRole}</strong>. The employee will receive an automated rejection notice.
          </p>
          <div className="form-group">
            <label className="form-label">Rejection Reason *</label>
            <textarea
              className="textarea"
              rows={3}
              required
              placeholder="Operational requirement, resource constraint, incomplete documentation..."
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={submitting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detailed View Modal with Approval Timeline */}
      {viewingLeave && (
        <Modal isOpen={!!viewingLeave} onClose={() => setViewingLeave(null)} title={`Leave Application Details`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem' }}>
            {/* Header Summary */}
            <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Employee:</span>{' '}
                  <strong>{viewingLeave.employeeName || 'Self'}</strong> ({viewingLeave.employeeId || 'N/A'})
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Department:</span>{' '}
                  <strong>{viewingLeave.departmentName || 'General'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Leave Type:</span> <strong>{viewingLeave.leaveType}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Duration:</span>{' '}
                  <strong>
                    {viewingLeave.startDate} to {viewingLeave.endDate} ({viewingLeave.daysCount} days)
                  </strong>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                <div style={{ background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginTop: '0.25rem' }}>
                  {viewingLeave.reason || 'No description provided.'}
                </div>
              </div>
              {viewingLeave.attachment && (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
                  <Paperclip size={16} /> <span>Attachment: {viewingLeave.attachment}</span>
                </div>
              )}
            </div>

            {/* Visual Dual Approval Timeline */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontWeight: 600 }}>Approval Workflow Timeline</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', paddingLeft: '1.5rem' }}>
                <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border-color)' }} />

                {/* Step 1: Application Submitted */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  <div>
                    <strong>Applied for Leave</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Submitted on {viewingLeave.createdAt ? new Date(viewingLeave.createdAt).toLocaleString() : 'Recently'}
                    </div>
                  </div>
                </div>

                {/* Step 2: Employer Review */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background:
                        viewingLeave.employerStatus === 'APPROVED'
                          ? '#10b981'
                          : viewingLeave.employerStatus === 'REJECTED'
                          ? '#ef4444'
                          : '#f59e0b',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} /> <strong>Employer / Manager Approval:</strong>
                      <Badge
                        variant={
                          viewingLeave.employerStatus === 'APPROVED'
                            ? 'success'
                            : viewingLeave.employerStatus === 'REJECTED'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {viewingLeave.employerStatus || 'PENDING'}
                      </Badge>
                    </div>
                    {viewingLeave.employerActionBy && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Action by: {viewingLeave.employerActionBy} at {viewingLeave.employerActionAt ? new Date(viewingLeave.employerActionAt).toLocaleString() : ''}
                      </div>
                    )}
                    {viewingLeave.employerRejectionReason && (
                      <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Reason: {viewingLeave.employerRejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Admin Review */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background:
                        viewingLeave.adminStatus === 'APPROVED'
                          ? '#10b981'
                          : viewingLeave.adminStatus === 'REJECTED'
                          ? '#ef4444'
                          : '#f59e0b',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck size={16} /> <strong>Admin Approval:</strong>
                      <Badge
                        variant={
                          viewingLeave.adminStatus === 'APPROVED'
                            ? 'success'
                            : viewingLeave.adminStatus === 'REJECTED'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {viewingLeave.adminStatus || 'PENDING'}
                      </Badge>
                    </div>
                    {viewingLeave.adminActionBy && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Action by: {viewingLeave.adminActionBy} at {viewingLeave.adminActionAt ? new Date(viewingLeave.adminActionAt).toLocaleString() : ''}
                      </div>
                    )}
                    {viewingLeave.adminRejectionReason && (
                      <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Reason: {viewingLeave.adminRejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Final Status */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background:
                        viewingLeave.status === 'APPROVED'
                          ? '#10b981'
                          : viewingLeave.status === 'REJECTED'
                          ? '#ef4444'
                          : '#f59e0b',
                    }}
                  />
                  <div>
                    <strong>Final Overall Decision: </strong>
                    <Badge
                      variant={
                        viewingLeave.status === 'APPROVED'
                          ? 'success'
                          : viewingLeave.status === 'REJECTED'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {viewingLeave.status || 'PENDING'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Action Buttons inside modal */}
            {viewingLeave.status === 'PENDING' && user?.id !== viewingLeave.userId && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                }}
              >
                {activeRoleView === UserRole.EMPLOYER && (
                  <>
                    <Button variant="primary" onClick={() => handleEmployerAction(viewingLeave.id, 'APPROVE')}>
                      Approve as Employer
                    </Button>
                    <Button variant="danger" onClick={() => handleEmployerAction(viewingLeave.id, 'REJECT')}>
                      Reject as Employer
                    </Button>
                  </>
                )}
                {activeRoleView === UserRole.ADMIN && (
                  <>
                    <Button variant="primary" onClick={() => handleAdminAction(viewingLeave.id, 'APPROVE')}>
                      Approve as Admin
                    </Button>
                    <Button variant="danger" onClick={() => handleAdminAction(viewingLeave.id, 'REJECT')}>
                      Reject as Admin
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
};

export default LeavePage;
