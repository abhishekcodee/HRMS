import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { UserRole, MOCK_LEAVE_REQUESTS, MOCK_LEAVE_BALANCE, LeaveRequestMock, LeaveStatus } from '@hrms/shared';
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
import { FileCheck2, Plus, Calendar, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { role, currentUser } = useRole();
  const displayRequests = role === UserRole.EMPLOYEE 
    ? MOCK_LEAVE_REQUESTS.filter(l => l.employeeName.toLowerCase().includes(currentUser.firstName.toLowerCase()) || l.employeeId === currentUser.id) 
    : MOCK_LEAVE_REQUESTS;
  const [requests, setRequests] = useState<LeaveRequestMock[]>(displayRequests);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [viewingLeave, setViewingLeave] = useState<LeaveRequestMock | null>(null);

  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    startDate: '2026-08-20',
    endDate: '2026-08-21',
    reason: ''
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const newLeave: LeaveRequestMock = {
      id: `lvr-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: 'emp-1008',
      employeeName: 'Karan Verma',
      departmentName: 'Information Technology',
      leaveType: form.leaveType as any,
      startDate: form.startDate,
      endDate: form.endDate,
      totalDays: 2,
      reason: form.reason || 'Personal work',
      status: LeaveStatus.PENDING,
      appliedDate: new Date().toISOString().split('T')[0]
    };
    setRequests([newLeave, ...requests]);
    setApplyModalOpen(false);
    setForm({ leaveType: 'Casual Leave', startDate: '2026-08-20', endDate: '2026-08-21', reason: '' });
  };

  const handleApprove = (id: string) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: LeaveStatus.APPROVED, approverName: `${role} Approver` } : r))
    );
  };

  const handleReject = (id: string) => {
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status: LeaveStatus.REJECTED, approverName: `${role} Approver` } : r))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">
            {role === UserRole.EMPLOYEE ? 'Apply & Track Leave Balances' : 'Review and Process Employee Leave Requests (Single-Stage Approval)'}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setApplyModalOpen(true)}>
            + Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leave Balance Widgets */}
      <div className="stat-grid">
        <StatCard
          title="Casual Leave (CL)"
          value={`${MOCK_LEAVE_BALANCE.casualLeave.remaining} Days`}
          icon={<Calendar size={20} />}
          subtext={`Used ${MOCK_LEAVE_BALANCE.casualLeave.used} of ${MOCK_LEAVE_BALANCE.casualLeave.total} days`}
        />
        <StatCard
          title="Sick Leave (SL)"
          value={`${MOCK_LEAVE_BALANCE.sickLeave.remaining} Days`}
          icon={<Calendar size={20} />}
          subtext={`Used ${MOCK_LEAVE_BALANCE.sickLeave.used} of ${MOCK_LEAVE_BALANCE.sickLeave.total} days`}
        />
        <StatCard
          title="Earned Leave (EL)"
          value={`${MOCK_LEAVE_BALANCE.earnedLeave.remaining} Days`}
          icon={<FileCheck2 size={20} />}
          subtext={`Used ${MOCK_LEAVE_BALANCE.earnedLeave.used} of ${MOCK_LEAVE_BALANCE.earnedLeave.total} days`}
        />
      </div>

      {role !== UserRole.EMPLOYEE && (
        <Alert variant="info" title="Single-Stage Direct Approval Policy">
          Manager OR HR/Admin can directly approve leave applications without mandatory sequential authorization locks.
        </Alert>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {role === UserRole.EMPLOYEE ? 'My Leave Applications' : 'Employee Leave Requests'} ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardBody>
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
                  <Th>Approver</Th>
                  <Th style={{ textAlign: 'right' }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {requests.map(lvr => (
                  <Tr key={lvr.id}>
                    <Td style={{ fontWeight: 600 }}>{lvr.employeeName}</Td>
                    <Td>{lvr.departmentName}</Td>
                    <Td>{lvr.leaveType}</Td>
                    <Td>{lvr.startDate} to {lvr.endDate}</Td>
                    <Td>{lvr.totalDays} day(s)</Td>
                    <Td>{lvr.appliedDate}</Td>
                    <Td>
                      <Badge
                        variant={
                          lvr.status === LeaveStatus.APPROVED
                            ? 'success'
                            : lvr.status === LeaveStatus.PENDING
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {lvr.status}
                      </Badge>
                    </Td>
                    <Td>{lvr.approverName || '—'}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setViewingLeave(lvr)} />
                        {lvr.status === LeaveStatus.PENDING && role !== UserRole.EMPLOYEE && (
                          <>
                            <Button variant="primary" size="sm" onClick={() => handleApprove(lvr.id)}>
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleReject(lvr.id)}>
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
              { value: 'Earned Leave', label: 'Earned Leave (EL)' }
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
            <textarea className="textarea" rows={3} required placeholder="Reason for leave..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Submit Application</Button>
          </div>
        </form>
      </Modal>

      {/* View Leave Details Modal */}
      {viewingLeave && (
        <Modal isOpen={!!viewingLeave} onClose={() => setViewingLeave(null)} title={`Leave Details: ${viewingLeave.id}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Employee:</span> <strong>{viewingLeave.employeeName}</strong> ({viewingLeave.departmentName})</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Leave Type:</span> <strong>{viewingLeave.leaveType}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Duration:</span> <strong>{viewingLeave.startDate} to {viewingLeave.endDate} ({viewingLeave.totalDays} days)</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Reason:</span> <div>{viewingLeave.reason}</div></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <Badge variant={viewingLeave.status === 'APPROVED' ? 'success' : 'warning'}>{viewingLeave.status}</Badge></div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeavePage;
