import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { UserRole } from '@hrms/shared';
import {
  fetchLeaveRequests,
  applyLeaveInDb,
  approveLeaveInDb,
  rejectLeaveInDb,
  LeaveRecord,
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
  Alert
} from '../components/ui';
import { FileCheck2, Plus, Calendar, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { role } = useRole();
  const [requests, setRequests] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState<LeaveRecord | null>(null);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const loadLeaveData = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaveRequests({ status: activeTab !== 'ALL' ? activeTab : undefined });
      setRequests(data);
    } catch (err) {
      console.error('Failed to load leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, [activeTab]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const res = await applyLeaveInDb({
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      daysCount,
      reason: form.reason,
    });

    setSubmitting(false);
    if (res.success) {
      setToastMessage('Leave request submitted successfully! Email notification sent to HR.');
      setApplyModalOpen(false);
      setForm({ leaveType: 'Casual Leave', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], reason: '' });
      await loadLeaveData();
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert(res.error || 'Failed to submit leave request.');
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to APPROVE this leave request? An automated approval email will be sent to the employee.')) {
      return;
    }
    const res = await approveLeaveInDb(id);
    if (res.success) {
      setToastMessage('Leave request approved! Confirmation email dispatched to employee.');
      await loadLeaveData();
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert(res.error || 'Failed to approve leave request.');
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedLeaveId(id);
    setRejectionRemarks('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveId) return;

    setSubmitting(true);
    const res = await rejectLeaveInDb(selectedLeaveId, rejectionRemarks);
    setSubmitting(false);

    if (res.success) {
      setToastMessage('Leave request rejected. Rejection notice email dispatched to employee.');
      setRejectModalOpen(false);
      setSelectedLeaveId(null);
      await loadLeaveData();
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert(res.error || 'Failed to reject leave request.');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">
            {role === UserRole.EMPLOYEE ? 'Apply & Track Leave Applications' : 'Review and Process Employee Leave Requests (HR Email Workflow)'}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setApplyModalOpen(true)}>
            + Apply for Leave
          </Button>
        </div>
      </div>

      {toastMessage && (
        <Alert variant="success" title="Action Completed">
          {toastMessage}
        </Alert>
      )}

      {/* Leave Status Widgets */}
      <div className="stat-grid">
        <StatCard
          title="Pending Requests"
          value={`${pendingCount}`}
          icon={<Clock size={20} />}
          subtext="Awaiting HR Review"
        />
        <StatCard
          title="Approved Leaves"
          value={`${approvedCount}`}
          icon={<CheckCircle2 size={20} />}
          subtext="Confirmed & Active"
        />
        <StatCard
          title="Rejected Requests"
          value={`${rejectedCount}`}
          icon={<XCircle size={20} />}
          subtext="Declined Requests"
        />
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

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {role === UserRole.EMPLOYEE ? 'My Leave Applications' : 'Database Leave Requests'} ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave records from database...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No leave records found for selected filter.</div>
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Department</Th>
                    <Th>Leave Type</Th>
                    <Th>Dates</Th>
                    <Th>Days</Th>
                    <Th>Applied On</Th>
                    <Th>Status</Th>
                    <Th style={{ textAlign: 'right' }}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {requests.map(lvr => (
                    <Tr key={lvr.id}>
                      <Td style={{ fontWeight: 600 }}>
                        {lvr.employeeName || 'Me'}
                        {lvr.employeeId && <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{lvr.employeeId}</span>}
                      </Td>
                      <Td>{lvr.departmentName || 'General'}</Td>
                      <Td><Badge variant="info">{lvr.leaveType}</Badge></Td>
                      <Td>{lvr.startDate} to {lvr.endDate}</Td>
                      <Td style={{ fontWeight: 600 }}>{lvr.daysCount} day(s)</Td>
                      <Td>{lvr.createdAt ? new Date(lvr.createdAt).toLocaleDateString() : 'Today'}</Td>
                      <Td>
                        <Badge
                          variant={
                            lvr.status === 'APPROVED'
                              ? 'success'
                              : lvr.status === 'PENDING'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {lvr.status}
                        </Badge>
                      </Td>
                      <Td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setViewingLeave(lvr)} />
                          {lvr.status === 'PENDING' && role !== UserRole.EMPLOYEE && (
                            <>
                              <Button variant="primary" size="sm" onClick={() => handleApprove(lvr.id)}>
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openRejectModal(lvr.id)}>
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>

      {/* Apply Leave Modal */}
      <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Leave Type *"
            required
            options={[
              { value: 'Casual Leave', label: 'Casual Leave (CL)' },
              { value: 'Sick Leave', label: 'Sick Leave (SL)' },
              { value: 'Earned Leave', label: 'Earned Leave (EL)' },
              { value: 'Maternity Leave', label: 'Maternity / Paternity Leave' }
            ]}
            value={form.leaveType}
            onChange={e => setForm({ ...form, leaveType: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Start Date *" type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date *" type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea className="textarea" rows={3} required placeholder="State reason for leave request..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={submitting}>Submit & Notify HR via Email</Button>
          </div>
        </form>
      </Modal>

      {/* HR Rejection Remarks Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Leave Request">
        <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Please provide optional or required rejection remarks. An automated rejection email will be dispatched to the employee.
          </p>
          <div className="form-group">
            <label className="form-label">Rejection Remarks *</label>
            <textarea
              className="textarea"
              rows={3}
              required
              placeholder="State reason for rejection (e.g. Operational requirements, scheduling conflict)..."
              value={rejectionRemarks}
              onChange={e => setRejectionRemarks(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" isLoading={submitting}>Confirm Rejection & Send Email</Button>
          </div>
        </form>
      </Modal>

      {/* View Leave Details Modal */}
      {viewingLeave && (
        <Modal isOpen={!!viewingLeave} onClose={() => setViewingLeave(null)} title={`Leave Details: ${viewingLeave.id}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Employee:</span> <strong>{viewingLeave.employeeName || 'Self'}</strong> ({viewingLeave.departmentName || 'General'})</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Employee ID:</span> <strong>{viewingLeave.employeeId || 'N/A'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Leave Type:</span> <strong>{viewingLeave.leaveType}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Duration:</span> <strong>{viewingLeave.startDate} to {viewingLeave.endDate} ({viewingLeave.daysCount} days)</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Reason:</span> <div>{viewingLeave.reason || 'No reason provided.'}</div></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <Badge variant={viewingLeave.status === 'APPROVED' ? 'success' : viewingLeave.status === 'PENDING' ? 'warning' : 'error'}>{viewingLeave.status}</Badge></div>
            {viewingLeave.rejectionRemarks && (
              <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>HR Rejection Remarks:</span>
                <p style={{ color: '#991b1b', margin: '0.25rem 0 0 0' }}>{viewingLeave.rejectionRemarks}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeavePage;

