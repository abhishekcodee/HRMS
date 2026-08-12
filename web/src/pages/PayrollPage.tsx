import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { UserRole, MOCK_PAYSLIPS, PayslipMock } from '@hrms/shared';
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
  Alert
} from '../components/ui';
import { Receipt, Download, Eye, Play, CheckCircle2, ShieldAlert } from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const { role, currentUser } = useRole();
  const displayPayslips = role === UserRole.EMPLOYEE 
    ? MOCK_PAYSLIPS.filter(p => p.employeeName.toLowerCase().includes(currentUser.firstName.toLowerCase()) || p.employeeCode === currentUser.employeeId)
    : MOCK_PAYSLIPS;
  const [payslips] = useState<PayslipMock[]>(displayPayslips);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipMock | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Engine & Salary Disbursal</h1>
          <p className="page-subtitle">
            {role === UserRole.EMPLOYEE ? 'My Monthly Payslips & Salary Breakdown' : 'India Statutory Compliance (PF, ESI, TDS) & Salary Processing'}
          </p>
        </div>
        <div className="page-actions">
          {role !== UserRole.EMPLOYEE && (
            <Button variant="primary" icon={<Play size={16} />} onClick={() => setRunModalOpen(true)}>
              Run Payroll Batch
            </Button>
          )}
        </div>
      </div>

      {role !== UserRole.EMPLOYEE && (
        <>
          <Alert variant="info" title="India Compliance Payroll Engine Boundaries">
            Salary components include standard Provident Fund (PF 12%), Employee State Insurance (ESI 0.75%), and Tax Deducted at Source (TDS) breakdowns.
          </Alert>

          {/* Payroll Stat Summary Cards */}
          <div className="stat-grid">
            <StatCard title="July 2026 Gross Payroll" value="₹4,10,000" icon={<Receipt size={20} />} subtext="Total company gross expenditure" />
            <StatCard title="Statutory PF Deductions" value="₹24,600" icon={<Receipt size={20} />} subtext="Deposited to EPFO portal" />
            <StatCard title="Total Net Salary Disbursed" value="₹3,43,762" icon={<Receipt size={20} />} change="100% Cleared" changeType="positive" />
          </div>
        </>
      )}

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>{role === UserRole.EMPLOYEE ? 'My Payslips' : 'Employee Payslips Directory'}</CardTitle>
        </CardHeader>
        <CardBody>
          <TableContainer>
            <Table>
              <Thead>
                <Tr>
                  <Th>Employee</Th>
                  <Th>ID</Th>
                  <Th>Month & Year</Th>
                  <Th>Gross Salary</Th>
                  <Th>Total Deductions</Th>
                  <Th>Net Salary Disbursed</Th>
                  <Th>Status</Th>
                  <Th style={{ textAlign: 'right' }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payslips.map(ps => (
                  <Tr key={ps.id}>
                    <Td style={{ fontWeight: 600 }}>{ps.employeeName}</Td>
                    <Td style={{ fontFamily: 'monospace' }}>{ps.employeeCode}</Td>
                    <Td>{ps.monthYear}</Td>
                    <Td>₹{ps.grossSalary.toLocaleString('en-IN')}</Td>
                    <Td style={{ color: 'var(--error-text)' }}>₹{ps.totalDeductions.toLocaleString('en-IN')}</Td>
                    <Td style={{ fontWeight: 700, color: 'var(--success-text)' }}>₹{ps.netSalary.toLocaleString('en-IN')}</Td>
                    <Td><Badge variant="success">{ps.status}</Badge></Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <Button variant="outline" size="sm" icon={<Eye size={14} />} onClick={() => setSelectedPayslip(ps)}>
                          View Slip
                        </Button>
                        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => alert('Downloading PDF payslip (UI Placeholder).')} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* Payslip Detail Modal Preview */}
      {selectedPayslip && (
        <Modal isOpen={!!selectedPayslip} onClose={() => setSelectedPayslip(null)} title={`Payslip Breakdown: ${selectedPayslip.monthYear}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedPayslip.employeeName}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedPayslip.designation} • {selectedPayslip.departmentName}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Employee ID</span>
                <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedPayslip.employeeCode}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Earnings */}
              <div style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success-text)', marginBottom: '0.75rem' }}>Earnings</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Basic Salary:</span> <strong>₹{selectedPayslip.basicSalary.toLocaleString('en-IN')}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>HRA:</span> <strong>₹{selectedPayslip.hra.toLocaleString('en-IN')}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Special Allowance:</span> <strong>₹{selectedPayslip.specialAllowance.toLocaleString('en-IN')}</strong></div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Gross Earnings:</span> <span>₹{selectedPayslip.grossSalary.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Statutory Deductions */}
              <div style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--error-text)', marginBottom: '0.75rem' }}>Statutory Deductions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Provident Fund (PF):</span> <strong>₹{selectedPayslip.pfDeduction.toLocaleString('en-IN')}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ESI Deduction:</span> <strong>₹{selectedPayslip.esiDeduction.toLocaleString('en-IN')}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Income Tax (TDS):</span> <strong>₹{selectedPayslip.tdsDeduction.toLocaleString('en-IN')}</strong></div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Total Deductions:</span> <span>₹{selectedPayslip.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div style={{ backgroundColor: 'var(--primary-glow)', border: '1px solid var(--primary-500)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>Net Take-Home Salary:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-500)' }}>
                ₹{selectedPayslip.netSalary.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Run Payroll Placeholder Modal */}
      <Modal isOpen={runModalOpen} onClose={() => setRunModalOpen(false)} title="Run Payroll Execution Engine">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Executes salary calculation batch for 65 active headcount for August 2026.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="outline" onClick={() => setRunModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setRunModalOpen(false); alert('Payroll execution batch triggered (UI Placeholder).'); }}>
              Execute Payroll Batch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollPage;
