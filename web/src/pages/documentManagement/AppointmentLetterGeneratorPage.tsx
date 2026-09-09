import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Input,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
} from '../../components/ui';
import {
  FileText,
  PlusCircle,
  History,
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle,
  Building,
  UserCheck,
} from 'lucide-react';
import { AppointmentLetterPreview } from '../../components/documents/AppointmentLetterPreview';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const AppointmentLetterGeneratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Step 1: Employee Details
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('Rahul Sharma');
  const [designation, setDesignation] = useState('Software Engineer');
  const [employeeCode, setEmployeeCode] = useState('EMP001');
  const [letterDate, setLetterDate] = useState('31/08/2026');
  const [joiningDate, setJoiningDate] = useState('01/09/2026');
  const [acceptanceDate, setAcceptanceDate] = useState('31/08/2026');

  // Step 2: Salary Details
  const [monthlyGross, setMonthlyGross] = useState<number>(50000);
  const [annualCtc, setAnnualCtc] = useState<number>(600000);
  const [basicSalary, setBasicSalary] = useState<number>(25000);
  const [hra, setHra] = useState<number>(12500);
  const [conveyanceAllowance, setConveyanceAllowance] = useState<number>(2500);
  const [specialAllowance, setSpecialAllowance] = useState<number>(5000);
  const [otherAllowances, setOtherAllowances] = useState<number>(5000);
  const [includeSalaryAnnexure, setIncludeSalaryAnnexure] = useState(true);

  // Step 3: Company Details
  const [companyName, setCompanyName] = useState('Acme Global Technologies Pvt. Ltd.');
  const [companyAddress, setCompanyAddress] = useState('Plot 42, Rabale MIDC, Industrial Area, Navi Mumbai, MH 400701');
  const [hrName, setHrName] = useState('Rajesh Sharma');
  const [hrDesignation, setHrDesignation] = useState('Head of Human Resources');

  // Preview / Form state
  const [previewMode, setPreviewMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generatedDocResult, setGeneratedDocResult] = useState<any | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    fetchEmployeesList();
    fetchHistory();
  }, []);

  const fetchEmployeesList = async () => {
    try {
      const res = await fetch('/api/v1/employees', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEmployeesList(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/v1/appointment-letters/history', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistoryList(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectExistingEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employeesList.find((e) => e.id === empId || e.userId === empId || e.employeeId === empId);
    if (emp) {
      setEmployeeName(emp.fullName || emp.name || '');
      setEmployeeCode(emp.employeeId || emp.emp_code || '');
      setDesignation(emp.designation || '');
      if (emp.joining_date || emp.joiningDate) {
        setJoiningDate(emp.joining_date || emp.joiningDate);
      }
      if (emp.salary) {
        const sal = parseFloat(emp.salary);
        setMonthlyGross(sal);
        setAnnualCtc(sal * 12);
        setBasicSalary(sal * 0.5);
        setHra(sal * 0.25);
        setConveyanceAllowance(sal * 0.05);
        setSpecialAllowance(sal * 0.1);
        setOtherAllowances(sal * 0.1);
      }
    }
  };

  const handleUseExistingSalary = () => {
    const emp = employeesList.find((e) => e.id === selectedEmployeeId || e.employeeId === employeeCode);
    if (emp && emp.salary) {
      const sal = parseFloat(emp.salary);
      setMonthlyGross(sal);
      setAnnualCtc(sal * 12);
      setBasicSalary(sal * 0.5);
      setHra(sal * 0.25);
      setConveyanceAllowance(sal * 0.05);
      setSpecialAllowance(sal * 0.1);
      setOtherAllowances(sal * 0.1);
    } else {
      // Default standard breakdown for 50,000 monthly
      setMonthlyGross(50000);
      setAnnualCtc(600000);
      setBasicSalary(25000);
      setHra(12500);
      setConveyanceAllowance(2500);
      setSpecialAllowance(5000);
      setOtherAllowances(5000);
    }
  };

  const validateForm = () => {
    if (!employeeName.trim()) return 'Employee Name is required.';
    if (!designation.trim()) return 'Employee Designation is required.';
    if (!employeeCode.trim()) return 'Employee ID is required.';
    if (!letterDate.trim()) return 'Appointment Letter Date is required.';
    if (!joiningDate.trim()) return 'Date of Joining is required.';
    return null;
  };

  const handleGeneratePDF = async () => {
    const err = validateForm();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setGenerating(true);

    try {
      const payload = {
        employee_id: selectedEmployeeId || undefined,
        employee_name: employeeName,
        employee_code: employeeCode,
        designation,
        letter_date: letterDate,
        joining_date: joiningDate,
        acceptance_date: acceptanceDate,
        monthly_gross: monthlyGross,
        annual_ctc: annualCtc,
        basic_salary: basicSalary,
        hra,
        conveyance_allowance: conveyanceAllowance,
        special_allowance: specialAllowance,
        other_allowances: otherAllowances,
        company_name: companyName,
        company_address: companyAddress,
        hr_name: hrName,
        hr_designation: hrDesignation,
        status: 'FINAL',
      };

      const res = await fetch('/api/v1/appointment-letters/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Appointment letter for ${employeeName} generated successfully!`);
        setGeneratedDocResult(json.data);
        fetchHistory();
        setPreviewMode(true);
      } else {
        setValidationError(json.error?.message || 'Failed to generate appointment letter.');
      }
    } catch (error) {
      setValidationError('Network error occurred while generating PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleRegenerateFromHistory = (item: any) => {
    setSelectedEmployeeId(item.userId || '');
    setEmployeeName(item.employeeName || '');
    setEmployeeCode(item.employeeCode || '');
    setDesignation(item.designation || '');
    setJoiningDate(item.joiningDate || '01/09/2026');
    setLetterDate(item.generatedDate || '31/08/2026');
    setAcceptanceDate(item.acceptanceDate || item.generatedDate || '31/08/2026');
    if (item.annualCtc) setAnnualCtc(item.annualCtc);
    if (item.monthlyGross) setMonthlyGross(item.monthlyGross);
    if (item.basicSalary) setBasicSalary(item.basicSalary);
    if (item.hrName) setHrName(item.hrName);
    if (item.hrDesignation) setHrDesignation(item.hrDesignation);

    setActiveTab('create');
    setPreviewMode(false);
    setSuccessMsg(`Loaded ${item.employeeName} (${item.employeeCode}) details for regeneration.`);
  };

  const filteredHistory = historyList.filter(
    (h) =>
      h.employeeName?.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.employeeCode?.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.designation?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const previewData = {
    companyName,
    companyAddress,
    letterDate,
    employeeName,
    designation,
    joiningDate,
    employeeCode,
    acceptanceDate,
    hrName,
    hrDesignation,
    monthlyGross,
    annualCtc,
    basicSalary,
    hra,
    conveyanceAllowance,
    specialAllowance,
    otherAllowances,
    includeSalaryAnnexure,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '24px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '16px',
          color: '#FFFFFF',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              <FileText style={{ width: '24px', height: '24px', color: '#60A5FA' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Appointment Letter Generator Studio
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 52px', color: '#94A3B8', fontSize: '14px' }}>
            Generate official, print-ready appointment letters matching exact corporate reference templates with salary annexures & version control.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'create' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PlusCircle style={{ width: '16px', height: '16px' }} /> Create Appointment Letter
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'history' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <History style={{ width: '16px', height: '16px' }} /> Document History ({historyList.length})
          </button>
        </div>
      </div>

      {validationError && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="error" title="Validation Error">{validationError}</Alert>
        </div>
      )}

      {successMsg && (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="success" title="Success">{successMsg}</Alert>
        </div>
      )}

      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: previewMode ? '420px 1fr' : '1fr 1fr', gap: '24px' }}>
          {/* Form Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Existing Employee Select Helper */}
            <Card style={{ borderLeft: '4px solid #3B82F6' }}>
              <CardBody style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <UserCheck style={{ width: '18px', height: '18px', color: '#3B82F6' }} />
                  <strong style={{ fontSize: '14px', color: '#0F172A' }}>Option: Select Existing Employee Profile</strong>
                </div>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleSelectExistingEmployee(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="">-- Manual Entry / New Employee --</option>
                  {employeesList.map((emp) => (
                    <option key={emp.id || emp.userId || emp.employeeId} value={emp.id || emp.userId || emp.employeeId}>
                      {emp.fullName || emp.name} ({emp.employeeId || 'EMP'}) - {emp.designation || 'Staff'}
                    </option>
                  ))}
                </select>
              </CardBody>
            </Card>

            {/* Section 1: Employee Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: '15px', color: '#0F172A' }}>1. Employee Appointment Details</CardTitle>
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Employee Full Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Employee Designation <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Software Engineer" required />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Employee ID <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="e.g. EMP001" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Letter Date <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <Input value={letterDate} onChange={(e) => setLetterDate(e.target.value)} placeholder="DD/MM/YYYY" required />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Date of Joining <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <Input value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} placeholder="DD/MM/YYYY" required />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Section 2: Salary Details */}
            <Card>
              <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle style={{ fontSize: '15px', color: '#0F172A' }}>2. Salary & Remuneration Structure</CardTitle>
                <Button variant="secondary" size="sm" onClick={handleUseExistingSalary} style={{ fontSize: '12px' }}>
                  Use Existing Salary Details
                </Button>
              </CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Monthly Gross (₹)</label>
                    <Input
                      type="number"
                      value={monthlyGross}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMonthlyGross(val);
                        setAnnualCtc(val * 12);
                        setBasicSalary(val * 0.5);
                        setHra(val * 0.25);
                        setConveyanceAllowance(val * 0.05);
                        setSpecialAllowance(val * 0.1);
                        setOtherAllowances(val * 0.1);
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Annual CTC (₹)</label>
                    <Input
                      type="number"
                      value={annualCtc}
                      onChange={(e) => setAnnualCtc(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Basic Salary (₹)</label>
                    <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>HRA (₹)</label>
                    <Input type="number" value={hra} onChange={(e) => setHra(Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Conveyance (₹)</label>
                    <Input type="number" value={conveyanceAllowance} onChange={(e) => setConveyanceAllowance(Number(e.target.value))} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Special Allowance (₹)</label>
                    <Input type="number" value={specialAllowance} onChange={(e) => setSpecialAllowance(Number(e.target.value))} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={includeSalaryAnnexure}
                    onChange={(e) => setIncludeSalaryAnnexure(e.target.checked)}
                  />
                  Include Annexure A (Salary Breakdown Table) in document
                </label>
              </CardBody>
            </Card>

            {/* Section 3: Company & Signatory Details */}
            <Card>
              <CardHeader><CardTitle style={{ fontSize: '15px', color: '#0F172A' }}>3. Company & Signatory Configuration</CardTitle></CardHeader>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Name</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Address</label>
                  <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>HR Signatory Name</label>
                    <Input value={hrName} onChange={(e) => setHrName(e.target.value)} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>HR Designation</label>
                    <Input value={hrDesignation} onChange={(e) => setHrDesignation(e.target.value)} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Live Preview & Action Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle style={{ fontSize: '15px' }}>Document Action Toolbar</CardTitle>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                    {previewMode ? 'Edit Details' : 'Preview Document'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleGeneratePDF} disabled={generating} icon={<Sparkles style={{ width: '14px', height: '14px' }} />}>
                    {generating ? 'Generating...' : 'Generate PDF'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handlePrintDocument} icon={<Printer style={{ width: '14px', height: '14px' }} />}>
                    Print / Export
                  </Button>
                </div>
              </CardHeader>
              <CardBody style={{ background: '#F8FAFC', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Generated Filename: <code>Appointment_Letter_{employeeName.replace(/\s+/g, '_')}_{employeeCode}.pdf</code></span>
                  <Badge variant="success">Reference PDF Format Match</Badge>
                </div>
              </CardBody>
            </Card>

            {/* Document Preview Rendering Pane */}
            <div style={{ overflowX: 'auto', background: '#334155', padding: '24px', borderRadius: '12px' }}>
              <AppointmentLetterPreview data={previewData} scale={0.85} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle style={{ fontSize: '16px' }}>Appointment Letter History & Version Ledger</CardTitle>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Input
                placeholder="Search by Employee Name, ID, or Designation..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <Button variant="secondary" onClick={fetchHistory} icon={<RefreshCw style={{ width: '14px', height: '14px' }} />}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Employee Name</Th>
                    <Th>Employee ID</Th>
                    <Th>Designation</Th>
                    <Th>Joining Date</Th>
                    <Th>Letter Date</Th>
                    <Th>Annual CTC</Th>
                    <Th>Version</Th>
                    <Th>Status</Th>
                    <Th style={{ textAlign: 'right' }}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loadingHistory ? (
                    <Tr><Td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Loading appointment letters history...</Td></Tr>
                  ) : filteredHistory.length === 0 ? (
                    <Tr><Td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>No appointment letter records found.</Td></Tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <Tr key={item.id}>
                        <Td style={{ fontWeight: 600, color: '#0F172A' }}>{item.employeeName}</Td>
                        <Td><code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px' }}>{item.employeeCode}</code></Td>
                        <Td>{item.designation}</Td>
                        <Td>{item.joiningDate}</Td>
                        <Td>{item.generatedDate}</Td>
                        <Td style={{ fontWeight: 600 }}>₹{Number(item.annualCtc || 0).toLocaleString('en-IN')}</Td>
                        <Td><Badge variant="info">v{item.versionNumber || 1}.0</Badge></Td>
                        <Td><Badge variant="success">{item.status || 'FINAL'}</Badge></Td>
                        <Td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRegenerateFromHistory(item)}
                              icon={<RefreshCw style={{ width: '12px', height: '12px' }} />}
                            >
                              Regenerate
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.open(item.pdfPath || '#', '_blank')}
                              icon={<Download style={{ width: '12px', height: '12px' }} />}
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
      )}
    </div>
  );
};

export default AppointmentLetterGeneratorPage;
