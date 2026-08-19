import React, { useState, useEffect } from 'react';
import { MOCK_AUDIT_LOGS } from '@hrms/shared';
import { fetchLeaveAuditTrail, fetchEmailLogs, retryEmailNotificationInDb, LeaveAuditRecord, EmailLogRecord } from '../services/leaveApi';
import { Card, CardHeader, CardTitle, CardBody, TableContainer, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, Alert } from '../components/ui';
import { RefreshCw } from 'lucide-react';

interface SystemAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  role: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export const AuditLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'leave' | 'email'>('system');
  const [systemLogs, setSystemLogs] = useState<SystemAuditLog[]>([]);
  const [leaveAudits, setLeaveAudits] = useState<LeaveAuditRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'system') {
        const token = localStorage.getItem('hrms_token');
        const res = await fetch('/api/v1/users/audit-logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSystemLogs(json.data);
        }
      } else if (activeTab === 'leave') {
        const data = await fetchLeaveAuditTrail();
        setLeaveAudits(data);
      } else if (activeTab === 'email') {
        const data = await fetchEmailLogs();
        setEmailLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleRetryEmail = async (id: string) => {
    const res = await retryEmailNotificationInDb(id);
    if (res.success) {
      setToastMsg('Email re-sent successfully!');
      await loadData();
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      alert(res.error || 'Failed to retry email.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security, Leave Audit & Email Logs</h1>
          <p className="page-subtitle">Immutably tracked system audit trail, leave actions, and email notification logs</p>
        </div>
      </div>

      {toastMsg && (
        <Alert variant="success" title="Success Notification">
          {toastMsg}
        </Alert>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'system' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('system')}
        >
          System Security Logs
        </button>
        <button
          className={`btn ${activeTab === 'leave' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('leave')}
        >
          Leave Audit Trail
        </button>
        <button
          className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('email')}
        >
          Email Notification Logs
        </button>
      </div>

      {activeTab === 'system' && (
        <Card>
          <CardHeader><CardTitle>Live System Security & Audit Logs ({systemLogs.length})</CardTitle></CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading system audit logs...</div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Timestamp</Th>
                      <Th>User Email</Th>
                      <Th>Role</Th>
                      <Th>Action Event</Th>
                      <Th>Details</Th>
                      <Th>IP Address</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {systemLogs.map(log => (
                      <Tr key={log.id}>
                        <Td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString()}</Td>
                        <Td style={{ fontWeight: 600 }}>{log.userEmail || 'System'}</Td>
                        <Td><Badge variant="info">{log.role || 'system'}</Badge></Td>
                        <Td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-500)' }}>{log.action}</Td>
                        <Td>{log.details}</Td>
                        <Td style={{ fontFamily: 'monospace' }}>{log.ipAddress}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'leave' && (
        <Card>
          <CardHeader><CardTitle>Leave Action Audit Trail ({leaveAudits.length})</CardTitle></CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave audit trail...</div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Action Date</Th>
                      <Th>Employee ID</Th>
                      <Th>Action Event</Th>
                      <Th>Status Transition</Th>
                      <Th>Action By</Th>
                      <Th>Remarks</Th>
                      <Th>IP Address</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {leaveAudits.map(item => (
                      <Tr key={item.id}>
                        <Td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{new Date(item.actionDate).toLocaleString()}</Td>
                        <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.employeeId}</Td>
                        <Td>
                          <Badge variant={item.action === 'LEAVE_APPROVED' ? 'success' : item.action === 'LEAVE_REJECTED' ? 'error' : 'info'}>
                            {item.action}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: '0.8125rem' }}>
                          {item.previousStatus || 'NEW'} &rarr; <strong>{item.newStatus}</strong>
                        </Td>
                        <Td>{item.actionBy}</Td>
                        <Td>{item.remarks || '—'}</Td>
                        <Td style={{ fontFamily: 'monospace' }}>{item.ipAddress || '127.0.0.1'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'email' && (
        <Card>
          <CardHeader><CardTitle>Email Delivery Log ({emailLogs.length})</CardTitle></CardHeader>
          <CardBody>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading email logs...</div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Created At</Th>
                      <Th>Recipient Email</Th>
                      <Th>Email Type</Th>
                      <Th>Subject</Th>
                      <Th>Status</Th>
                      <Th>Retries</Th>
                      <Th style={{ textAlign: 'right' }}>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {emailLogs.map(log => (
                      <Tr key={log.id}>
                        <Td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString()}</Td>
                        <Td style={{ fontWeight: 600 }}>{log.recipientEmail}</Td>
                        <Td><Badge variant="info">{log.emailType}</Badge></Td>
                        <Td style={{ fontSize: '0.8125rem' }}>{log.subject}</Td>
                        <Td>
                          <Badge variant={log.status === 'SENT' ? 'success' : log.status === 'PENDING' ? 'warning' : 'error'}>
                            {log.status}
                          </Badge>
                        </Td>
                        <Td style={{ textAlign: 'center' }}>{log.retryCount}</Td>
                        <Td style={{ textAlign: 'right' }}>
                          {log.status === 'FAILED' && (
                            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => handleRetryEmail(log.id)}>
                              Retry
                            </Button>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default AuditLogsPage;

