import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@hrms/shared';
import {
  fetchLeaveRequests,
  fetchLeaveBalances,
  applyLeaveInDb,
  employerActionInDb,
  adminActionInDb,
  LeaveRecord,
  LeaveBalanceRecord,
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
} from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { user, activeRoleView } = useAuth();
  const [requests, setRequests] = useState<LeaveRecord[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetActionRole, setTargetActionRole] = useState<'EMPLOYER' | 'ADMIN'>('EMPLOYER');
  const [viewingLeave, setViewingLeave] = useState<LeaveRecord | null>(null);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    attachment: '',
  });

  // Calculate days count dynamically
  const calculatedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 1;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (start > end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [form.startDate, form.endDate]);

  // Find available balance for selected leave type
  const currentAvailableBalance = useMemo(() => {
    const balObj = balances.find((b) => b.leaveType === form.leaveType);
    if (!balObj) return 12;
    const allocated = parseFloat(String(balObj.allocatedDays));
    const used = parseFloat(String(balObj.usedDays));
    return Math.max(0, allocated - used);
  }, [balances, form.leaveType]);

  const loadLeaveData = async () => {
    setLoading(true);
    try {
      const [reqData, balData] = await Promise.all([
        fetchLeaveRequests({
          status: activeTab !== 'ALL' ? activeTab : undefined,
          view: activeRoleView ? activeRoleView.toLowerCase() : undefined,
        }),
        fetchLeaveBalances(),
      ]);
      setRequests(reqData);
      setBalances(balData);
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
        text: `Insufficient balance for ${form.leaveType}. Requested: ${calculatedDays} day(s), Available: ${currentAvailableBalance} day(s).`,
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
      setToastMessage({
        type: 'success',
        text: 'Leave request submitted successfully! Notification routed to Employer and Admin for Dual Approval.',
      });
      setApplyModalOpen(false);
      setForm({
        leaveType: 'Casual Leave',
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
              ? 'Apply & Track Personal Leave Applications with Dual Approval'
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

      {/* Leave Summary & Balance Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard
          title="Pending Requests"
          value={`${pendingCount}`}
          icon={<Clock size={20} />}
          subtext={activeRoleView === UserRole.EMPLOYEE ? 'My Pending Applications' : 'Awaiting Approval'}
        />
        <StatCard
          title="Approved Leaves"
          value={`${approvedCount}`}
          icon={<CheckCircle2 size={20} />}
          subtext={activeRoleView === UserRole.EMPLOYEE ? 'My Approved Leaves' : 'Confirmed & Active'}
        />
        <StatCard
          title="Rejected Requests"
          value={`${rejectedCount}`}
          icon={<XCircle size={20} />}
          subtext={activeRoleView === UserRole.EMPLOYEE ? 'My Rejected Applications' : 'Declined Applications'}
        />

        {activeRoleView === UserRole.EMPLOYEE ? (
          /* Live Employee Personal Leave Balances Cards */
          balances.map((bal) => {
            const alloc = parseFloat(String(bal.allocatedDays));
            const used = parseFloat(String(bal.usedDays));
            const avail = Math.max(0, alloc - used);
            return (
              <Card key={bal.id} style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {bal.leaveType} Balance
                  </span>
                  <Badge variant={avail > 0 ? 'success' : 'error'}>{avail} Available</Badge>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--text-primary)' }}>
                  {avail} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {alloc} days</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Used: {used} day(s)</div>
              </Card>
            );
          })
        ) : (
          <StatCard
            title="Total Applications"
            value={`${requests.length}`}
            icon={<UserCheck size={20} />}
            subtext="Live MySQL Database Records"
          />
        )}
      </div>

      {/* Workflow Rule Notice Banner */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
        }}
      >
        <ShieldCheck size={22} color="#3b82f6" style={{ flexShrink: 0 }} />
        <div>
          <strong>Leave Approval Rule:</strong> Approval from <strong>EITHER</strong> Employer/Manager <strong>OR</strong> Admin immediately approves the leave application.
          Leave balance is deducted upon approval.
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'ALL' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('ALL')}
        >
          All Requests ({requests.length})
        </button>
        <button
          className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('PENDING')}
        >
          Pending ({pendingCount})
        </button>
        <button
          className={`btn ${activeTab === 'APPROVED' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('APPROVED')}
        >
          Approved ({approvedCount})
        </button>
        <button
          className={`btn ${activeTab === 'REJECTED' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('REJECTED')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Main Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeRoleView === UserRole.EMPLOYEE
              ? 'My Leave Requests (Dual Approval Tracker)'
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

      {/* Apply Leave Modal */}
      <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Leave Type *"
            required
            options={[
              { value: 'Casual Leave', label: 'Casual Leave (CL)' },
              { value: 'Sick Leave', label: 'Sick Leave (SL)' },
              { value: 'Earned Leave', label: 'Earned Leave (EL)' },
              { value: 'Maternity Leave', label: 'Maternity / Paternity Leave' },
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
              justify: 'space-between',
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
                  justify: 'flex-end',
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
