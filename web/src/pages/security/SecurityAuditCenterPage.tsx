import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
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
} from '../../components/ui';
import { ShieldCheck, Key, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const SecurityAuditCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  // MFA Modal State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaData, setMfaData] = useState<any | null>(null);
  const [mfaPin, setMfaPin] = useState('');
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/security/audit-logs', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleInitiateMfa = async () => {
    try {
      const res = await fetch('/api/v1/security/mfa/setup', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setMfaData(json.data);
        setMfaModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to set up MFA:', err);
    }
  };

  const handleEnableMfa = async () => {
    try {
      const res = await fetch('/api/v1/security/mfa/enable', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ pin: mfaPin }),
      });
      const json = await res.json();
      if (json.success) {
        setMfaSuccessMsg(json.message);
        setTimeout(() => {
          setMfaModalOpen(false);
          setMfaSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to verify MFA pin:', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#FFFFFF',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck style={{ width: '28px', height: '28px', color: '#60A5FA' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
              Centralized Security & Audit Event Monitor
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 38px', color: '#94A3B8', fontSize: '14px' }}>
            Real-time defense-in-depth audit trail: Tenant Isolation, Rate Limiting, RBAC Checks, Document Access & MFA.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={handleInitiateMfa} icon={<Key style={{ width: '16px', height: '16px' }} />}>
            Configure MFA / Step-Up Auth
          </Button>
          <Button variant="secondary" onClick={loadLogs} icon={<RefreshCw style={{ width: '16px', height: '16px' }} />}>
            Refresh Logs
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardTitle style={{ fontSize: '16px' }}>Security Audit Trail</CardTitle>
          <Input
            placeholder="Filter by Action (e.g., DOCUMENT_DOWNLOADED, LOGIN)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>User / Actor</Th>
                  <Th>Role</Th>
                  <Th>Action Event</Th>
                  <Th>Resource</Th>
                  <Th>IP Address</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr><Td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading audit trail...</Td></Tr>
                ) : logs.length === 0 ? (
                  <Tr><Td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No security audit logs recorded yet.</Td></Tr>
                ) : (
                  logs.filter(l => !actionFilter || l.action.toLowerCase().includes(actionFilter.toLowerCase())).map((log) => (
                    <Tr key={log.id}>
                      <Td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </Td>
                      <Td style={{ fontWeight: 600 }}>{log.actorUserEmail || 'ANONYMOUS'}</Td>
                      <Td><Badge variant="neutral">{(log.actorRole || 'SYSTEM').toUpperCase()}</Badge></Td>
                      <Td style={{ fontWeight: 600, color: '#1E293B' }}>{log.action}</Td>
                      <Td><code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px' }}>{log.resourceType}</code></Td>
                      <Td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{log.ipAddress || '127.0.0.1'}</Td>
                      <Td>
                        {log.status === 'SUCCESS' ? (
                          <Badge variant="success">SUCCESS</Badge>
                        ) : log.status === 'DENIED' ? (
                          <Badge variant="error">DENIED</Badge>
                        ) : (
                          <Badge variant="warning">{log.status}</Badge>
                        )}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* MFA Modal */}
      {mfaModalOpen && mfaData && (
        <Modal isOpen={mfaModalOpen} onClose={() => setMfaModalOpen(false)} title="Configure Multi-Factor Authentication (TOTP)">
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#334155' }}>
              Scan the Secret Key using Google Authenticator or Microsoft Authenticator app:
            </p>
            <div
              style={{
                background: '#F1F5F9',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '18px',
                letterSpacing: '2px',
                margin: '16px 0',
                wordBreak: 'break-all',
              }}
            >
              {mfaData.secret}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Enter 6-Digit Authenticator PIN
              </label>
              <Input
                value={mfaPin}
                onChange={(e) => setMfaPin(e.target.value)}
                placeholder="e.g. 123456"
                maxLength={6}
              />
            </div>

            {mfaSuccessMsg && (
              <div style={{ marginTop: '12px', color: '#059669', fontWeight: 600 }}>
                {mfaSuccessMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <Button variant="secondary" onClick={() => setMfaModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleEnableMfa}>Verify & Enable MFA</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SecurityAuditCenterPage;
