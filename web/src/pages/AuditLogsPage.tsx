import React from 'react';
import { MOCK_AUDIT_LOGS } from '@hrms/shared';
import { Card, CardHeader, CardTitle, CardBody, TableContainer, Table, Thead, Tbody, Tr, Th, Td, Badge } from '../components/ui';
import { History, ShieldAlert } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & Audit Logs</h1>
          <p className="page-subtitle">Immutably tracked system security audit trail for compliance</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>System Activity Logs ({MOCK_AUDIT_LOGS.length})</CardTitle></CardHeader>
        <CardBody>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Timestamp (UTC)</Th>
                  <Th>Actor Name</Th>
                  <Th>Role</Th>
                  <Th>Action Event</Th>
                  <Th>Target Module</Th>
                  <Th>Details</Th>
                  <Th>IP Address</Th>
                </Tr>
              </Thead>
              <Tbody>
                {MOCK_AUDIT_LOGS.map(log => (
                  <Tr key={log.id}>
                    <Td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.timestamp}</Td>
                    <Td style={{ fontWeight: 600 }}>{log.actorName}</Td>
                    <Td><Badge variant="info">{log.actorRole}</Badge></Td>
                    <Td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-500)' }}>{log.action}</Td>
                    <Td>{log.module}</Td>
                    <Td>{log.details}</Td>
                    <Td style={{ fontFamily: 'monospace' }}>{log.ipAddress}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
