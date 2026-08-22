import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  validateSalarySlipExcel,
  sendBulkSalarySlips,
  retryFailedSalarySlips,
  fetchSalarySlipLogs,
  ExcelValidationSummary,
  ExcelSalaryRecordPreview,
  BulkSendSummary,
  BulkSendResultDetail,
  SalarySlipLogRecord,
} from '../services/payrollApi';
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
import { Upload, FileSpreadsheet, Send, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

export const SalarySlipBulkPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ExcelValidationSummary | null>(null);
  const [previewList, setPreviewList] = useState<ExcelSalaryRecordPreview[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [sending, setSending] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<BulkSendSummary | null>(null);
  const [sendDetails, setSendDetails] = useState<BulkSendResultDetail[]>([]);
  const [retrying, setRetrying] = useState(false);

  const [logs, setLogs] = useState<SalarySlipLogRecord[]>([]);
  const [activeView, setActiveView] = useState<'upload' | 'logs'>('upload');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadLogs = async () => {
    const data = await fetchSalarySlipLogs();
    setLogs(data);
  };

  useEffect(() => {
    if (activeView === 'logs') {
      loadLogs();
    }
  }, [activeView]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setValidationSummary(null);
      setPreviewList([]);
      setBulkSummary(null);
      setSendDetails([]);
      setErrorMsg(null);
    }
  };

  const handleValidateExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setValidating(true);
    setErrorMsg(null);

    const res = await validateSalarySlipExcel(selectedFile);
    setValidating(false);

    if (res.success && res.summary && res.preview) {
      setValidationSummary(res.summary);
      setPreviewList(res.preview);
    } else {
      setErrorMsg(res.error || 'Failed to validate Excel file.');
    }
  };

  const handleConfirmSendBulk = async () => {
    setConfirmModalOpen(false);
    setSending(true);
    setErrorMsg(null);

    const validItems = previewList.filter(item => item.isValid);
    const res = await sendBulkSalarySlips(validItems);
    setSending(false);

    if (res.success && res.summary && res.details) {
      addNotification({
        type: 'PAYROLL',
        title: 'Salary Slips Dispatched',
        message: `${res.summary.sent} salary slip emails sent successfully to employees.`,
        link: '/salary-slips',
      });
      setBulkSummary(res.summary);
      setSendDetails(res.details);
      setToastMsg(`Salary slips processed! ${res.summary.sent} sent successfully, ${res.summary.failed} failed.`);
      setTimeout(() => setToastMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to process bulk salary slip emails.');
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    setErrorMsg(null);

    const res = await retryFailedSalarySlips();
    setRetrying(false);

    if (res.success) {
      setToastMsg(res.message || 'Failed salary slip emails re-sent successfully!');
      if (activeView === 'logs') {
        await loadLogs();
      }
      setTimeout(() => setToastMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to retry salary slip emails.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Salary Slip Email Module</h1>
          <p className="page-subtitle">
            Upload Excel file, validate employee records, preview email distribution, and dispatch salary slips with duplicate protection.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant={activeView === 'upload' ? 'primary' : 'outline'}
            icon={<FileSpreadsheet size={16} />}
            onClick={() => setActiveView('upload')}
          >
            Bulk Salary Upload
          </Button>
          <Button
            variant={activeView === 'logs' ? 'primary' : 'outline'}
            icon={<ShieldCheck size={16} />}
            onClick={() => setActiveView('logs')}
          >
            Salary Slip Email Logs
          </Button>
        </div>
      </div>

      {toastMsg && (
        <Alert variant="success" title="Success Notification">
          {toastMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="error" title="Validation / Processing Error">
          {errorMsg}
        </Alert>
      )}

      {activeView === 'upload' && (
        <>
          {/* Step 1: Excel File Upload Card */}
          <Card style={{ padding: '1.75rem' }}>
            <CardHeader><CardTitle>1. Upload Excel Salary Slip Dispatch File</CardTitle></CardHeader>
            <CardBody>
              <form onSubmit={handleValidateExcel} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: 'var(--bg-sidebar)' }}>
                  <Upload size={36} color="var(--primary-600)" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>Select Excel File (.xlsx, .xls, .csv)</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                    Required columns: Employee ID | Employee Name | Employee Email | Salary Month | Salary Year | Salary Slip File
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    style={{ fontSize: '0.875rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={validating}
                    disabled={!selectedFile || validating}
                    icon={<FileSpreadsheet size={16} />}
                  >
                    Validate Excel File & Preview
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Step 2: Validation Metrics & Preview Table */}
          {validationSummary && (
            <>
              <div className="stat-grid">
                <StatCard
                  title="Total Records"
                  value={`${validationSummary.totalRecords}`}
                  icon={<FileSpreadsheet size={20} />}
                  subtext="Rows in Uploaded Sheet"
                />
                <StatCard
                  title="Valid Records"
                  value={`${validationSummary.validCount}`}
                  icon={<CheckCircle2 size={20} />}
                  subtext="Eligible for Dispatch"
                />
                <StatCard
                  title="Invalid / Misconfigured"
                  value={`${validationSummary.invalidCount}`}
                  icon={<XCircle size={20} />}
                  subtext="Validation Errors"
                />
                <StatCard
                  title="Missing Email"
                  value={`${validationSummary.missingEmailCount}`}
                  icon={<AlertTriangle size={20} />}
                  subtext="Requires Employee Profile Update"
                />
              </div>

              <Card>
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <CardTitle>2. Pre-Send Validation Preview ({previewList.length} Rows)</CardTitle>
                    <Button
                      variant="primary"
                      disabled={validationSummary.validCount === 0 || sending}
                      onClick={() => setConfirmModalOpen(true)}
                      icon={<Send size={16} />}
                    >
                      Send Salary Slips ({validationSummary.validCount} Valid)
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <TableContainer>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Employee ID</Th>
                          <Th>Employee Name</Th>
                          <Th>Recipient Email</Th>
                          <Th>Pay Period</Th>
                          <Th>Salary Slip Attachment</Th>
                          <Th>Validation Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {previewList.map((rec, idx) => (
                          <Tr key={idx}>
                            <Td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{rec.employeeId}</Td>
                            <Td>{rec.employeeName}</Td>
                            <Td>{rec.employeeEmail}</Td>
                            <Td>{rec.salaryMonth} {rec.salaryYear}</Td>
                            <Td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{rec.salarySlipFile || 'Standard PDF Attachment'}</Td>
                            <Td>
                              {rec.isValid ? (
                                <Badge variant="success">VALID</Badge>
                              ) : (
                                <div>
                                  <Badge variant="error">INVALID</Badge>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>{rec.validationError}</span>
                                </div>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>
            </>
          )}

          {/* Step 3: Send Bulk Results Summary Dashboard */}
          {bulkSummary && (
            <Card style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <CardTitle>3. Bulk Dispatch Execution Results</CardTitle>
                  {bulkSummary.failed > 0 && (
                    <Button
                      variant="outline"
                      isLoading={retrying}
                      onClick={handleRetryFailed}
                      icon={<RefreshCw size={16} />}
                    >
                      Retry Failed Emails ({bulkSummary.failed})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                  <StatCard title="Processed" value={`${bulkSummary.total}`} icon={<FileSpreadsheet size={20} />} subtext="Total Items" />
                  <StatCard title="Successfully Sent" value={`${bulkSummary.sent}`} icon={<CheckCircle2 size={20} />} subtext="Dispatched Emails" />
                  <StatCard title="Delivery Failed" value={`${bulkSummary.failed}`} icon={<XCircle size={20} />} subtext="SMTP Errors" />
                  <StatCard title="Skipped / Duplicates" value={`${bulkSummary.skipped}`} icon={<AlertTriangle size={20} />} subtext="Duplicate Protection" />
                </div>

                <TableContainer>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Employee ID</Th>
                        <Th>Employee Name</Th>
                        <Th>Email</Th>
                        <Th>Pay Period</Th>
                        <Th>Status</Th>
                        <Th>Sent Time / Error</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sendDetails.map((det, i) => (
                        <Tr key={i}>
                          <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{det.employeeId}</Td>
                          <Td>{det.employeeName}</Td>
                          <Td>{det.email}</Td>
                          <Td>{det.salaryMonth}</Td>
                          <Td>
                            <Badge variant={det.status === 'SENT' ? 'success' : det.status === 'SKIPPED' ? 'neutral' : 'error'}>
                              {det.status}
                            </Badge>
                          </Td>
                          <Td style={{ fontSize: '0.8125rem' }}>
                            {det.status === 'SENT' ? (
                              <span style={{ color: 'var(--success-text)' }}>{det.sentTime ? new Date(det.sentTime).toLocaleTimeString() : 'Sent'}</span>
                            ) : (
                              <span style={{ color: '#b91c1c' }}>{det.errorMessage}</span>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          )}

          {/* Confirmation Modal */}
          <Modal
            isOpen={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            title="Confirm Bulk Salary Slip Email Dispatch"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Alert variant="warning" title="Confirmation Required">
                You are about to send official salary slips to <strong>{validationSummary?.validCount}</strong> validated employee email addresses.
              </Alert>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Each email will contain the pay period summary and corresponding attachment. Duplicate protection ensures employees who already received their slip for this month will be safely skipped.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirmSendBulk} icon={<Send size={16} />}>
                  Yes, Send Salary Slips Now
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {activeView === 'logs' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <CardTitle>Salary Slip Email Logs & Delivery History ({logs.length})</CardTitle>
              <Button variant="outline" isLoading={retrying} onClick={handleRetryFailed} icon={<RefreshCw size={16} />}>
                Retry All Failed Emails
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee ID</Th>
                    <Th>Employee Name</Th>
                    <Th>Email</Th>
                    <Th>Month / Year</Th>
                    <Th>Subject</Th>
                    <Th>Status</Th>
                    <Th>Sent At / Error</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map(log => (
                    <Tr key={log.id}>
                      <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.employeeId}</Td>
                      <Td>{log.employeeName || log.employeeId}</Td>
                      <Td>{log.employeeEmail}</Td>
                      <Td>{log.salaryMonth} {log.salaryYear}</Td>
                      <Td style={{ fontSize: '0.8125rem' }}>{log.emailSubject}</Td>
                      <Td>
                        <Badge variant={log.status === 'SENT' ? 'success' : log.status === 'PENDING' ? 'warning' : 'error'}>
                          {log.status}
                        </Badge>
                      </Td>
                      <Td style={{ fontSize: '0.8125rem' }}>
                        {log.status === 'SENT' ? (
                          <span style={{ color: 'var(--success-text)' }}>{log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Sent'}</span>
                        ) : (
                          <span style={{ color: '#b91c1c' }}>{log.errorMessage || 'Failed'}</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default SalarySlipBulkPage;
