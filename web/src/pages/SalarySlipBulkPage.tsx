import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  validateSalarySlipExcel,
  sendBulkSalarySlips,
  sendSingleSalarySlip,
  retryFailedSalarySlips,
  fetchSalarySlipLogs,
  ExcelValidationSummary,
  ExcelSalaryRecordPreview,
  BulkSendSummary,
  BulkSendResultDetail,
  SalarySlipLogRecord,
} from '../services/payrollApi';
import { PayslipPreview, PayslipData, convertToIndianWords } from '../components/documents/PayslipPreview';
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
  Alert,
  Input,
  Select
} from '../components/ui';
import {
  Upload,
  FileSpreadsheet,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Mail,
  Users,
  User,
  Search,
  FileText,
  DollarSign,
  CheckSquare,
  Square,
  Printer,
  Eye
} from 'lucide-react';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = ['2024', '2025', '2026', '2027'];

export const SalarySlipBulkPage: React.FC = () => {
  const { addNotification } = useNotifications();

  // Active Navigation View: 'single' | 'upload' | 'roster' | 'logs'
  const [activeView, setActiveView] = useState<'single' | 'upload' | 'roster' | 'logs'>('single');

  // Common notification / toast states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 1. Single Manual Salary Slip State
  // -------------------------------------------------------------
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [singleEmpSearch, setSingleEmpSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [singleEmployeeId, setSingleEmployeeId] = useState('');
  const [singleEmployeeName, setSingleEmployeeName] = useState('');
  const [singleEmployeeEmail, setSingleEmployeeEmail] = useState('');
  const [singleDesignation, setSingleDesignation] = useState('');
  const [singleDepartment, setSingleDepartment] = useState('');
  const [singleMonth, setSingleMonth] = useState('August');
  const [singleYear, setSingleYear] = useState('2026');
  const [singleBasicSalary, setSingleBasicSalary] = useState<string>('');
  const [singleHra, setSingleHra] = useState<string>('');
  const [singleGross, setSingleGross] = useState<string>('');
  const [singlePf, setSinglePf] = useState<string>('');
  const [singleEsic, setSingleEsic] = useState<string>('');
  const [singlePt, setSinglePt] = useState<string>('');
  const [singleDeductions, setSingleDeductions] = useState<string>('');
  const [singleNetPay, setSingleNetPay] = useState<string>('');
  const [singleSlipFile, setSingleSlipFile] = useState<File | null>(null);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [previewTab, setPreviewTab] = useState<'template' | 'email'>('template');

  // Print/Save Official Payslip PDF
  const handlePrintPayslip = () => {
    const printElement = document.getElementById('official-payslip-print-container');
    if (!printElement) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary_Slip_${singleEmployeeId || 'EMP-0001'}_${singleMonth}_${singleYear}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #FFFFFF; font-family: 'Times New Roman', Times, serif, Arial, sans-serif; }
            .payslip-page { margin: 0 auto !important; box-shadow: none !important; width: 210mm !important; min-height: 297mm !important; }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Live Payslip Template Data matching Image 2 & 3
  const currentPayslipData: PayslipData = {
    companyName: 'YOUR COMPANY PVT LTD',
    companyAddress: 'Address: R-601, Midc TTC Area, Near Hitech Radiator Tank Division, Navi Mumbai, Maharashtra 400701',
    payMonthYear: `${singleMonth.slice(0, 3)} ${singleYear}`,
    employeeName: singleEmployeeName || (singleEmployeeId ? `Employee (${singleEmployeeId})` : 'SAMPLE EMPLOYEE'),
    employeeCode: singleEmployeeId || 'EMP-0001',
    designation: singleDesignation || 'IOT Developer',
    workedDays: '28.00',
    joiningDate: '1-Nov-2025',
    uanNo: '000000000000',
    prevBalLeaves: '5.50',
    enjoyedLeaves: '4.50',
    balanceLeaves: '1.00',
    balanceWoff: '-',
    basicSalary: singleBasicSalary ? parseFloat(singleBasicSalary) : 16205,
    hra: singleHra ? parseFloat(singleHra) : 2405,
    providentFund: singlePf ? parseFloat(singlePf) : 1800,
    esic: singleEsic ? parseFloat(singleEsic) : 140,
    professionalTax: singlePt ? parseFloat(singlePt) : 200,
    totalEarnings: singleGross ? parseFloat(singleGross) : 18610,
    totalDeductions: singleDeductions ? parseFloat(singleDeductions) : 2140,
    netSalaryPaid: singleNetPay ? parseFloat(singleNetPay) : 16470,
    amountInWords: singleNetPay ? convertToIndianWords(parseFloat(singleNetPay)) : 'Rupees Sixteen Thousand Four Hundred Seventy Only',
    paymentMode: 'Bank Transfer',
    bankAccountNo: '060222010003352',
    bankName: 'Union Bank of India',
    dateOfBirth: '20-Jul-2004',
  };

  // Auto-calculate all salary figures from Basic Salary based on Image 2 & 3:
  // Basic: 16,205 -> HRA: 2,405 -> Gross: 18,610 -> PF: 1,800 -> ESIC: 140 -> PT: 200 -> Total Deductions: 2,140 -> Net Salary Paid: 16,470
  const calculateBreakdownFromBasic = (valStr: string) => {
    setSingleBasicSalary(valStr);
    const basic = parseFloat(valStr);
    if (!isNaN(basic) && basic > 0) {
      // 1. HRA: Derived proportionally from Image 2 (2,405 for 16,205 Basic)
      const hraVal = Math.round(basic * (2405 / 16205));
      setSingleHra(String(hraVal));

      // 2. Gross Earnings = Basic + HRA (16,205 + 2,405 = 18,610)
      const grossVal = basic + hraVal;
      setSingleGross(String(grossVal));

      // 3. Provident Fund: 12% capped at ₹1,800 (Image 2 Provident Fund = 1,800.00)
      const pfVal = Math.min(1800, Math.round(basic * 0.12));
      setSinglePf(String(pfVal));

      // 4. ESIC: 0.75% of Gross (18,610 * 0.0075 = 139.575 -> 140.00)
      const esicVal = grossVal <= 21000 ? Math.round(grossVal * 0.0075) : 0;
      setSingleEsic(String(esicVal));

      // 5. Professional Tax: Maharashtra statutory rate (Gross > 10,000 = 200.00)
      const ptVal = grossVal > 10000 ? 200 : (grossVal >= 7500 ? 175 : 0);
      setSinglePt(String(ptVal));

      // 6. Total Deductions = PF + ESIC + PT (1,800 + 140 + 200 = 2,140.00)
      const deductionsVal = pfVal + esicVal + ptVal;
      setSingleDeductions(String(deductionsVal));

      // 7. Net Salary Paid = Gross Earnings - Total Deductions (18,610 - 2,140 = 16,470.00)
      const netVal = grossVal - deductionsVal;
      setSingleNetPay(String(netVal));
    } else if (valStr === '') {
      setSingleHra('');
      setSingleGross('');
      setSinglePf('');
      setSingleEsic('');
      setSinglePt('');
      setSingleDeductions('');
      setSingleNetPay('');
    }
  };

  const handleHraChange = (valStr: string) => {
    setSingleHra(valStr);
    const basic = parseFloat(singleBasicSalary) || 0;
    const hra = parseFloat(valStr) || 0;
    const grossVal = basic + hra;
    setSingleGross(String(grossVal));

    const pfVal = parseFloat(singlePf) || Math.min(1800, Math.round(basic * 0.12));
    const esicVal = grossVal <= 21000 ? Math.round(grossVal * 0.0075) : 0;
    setSingleEsic(String(esicVal));
    const ptVal = grossVal > 10000 ? 200 : (grossVal >= 7500 ? 175 : 0);
    setSinglePt(String(ptVal));
    const deductionsVal = pfVal + esicVal + ptVal;
    setSingleDeductions(String(deductionsVal));
    setSingleNetPay(String(grossVal - deductionsVal));
  };

  const handleGrossChange = (valStr: string) => {
    setSingleGross(valStr);
    const gross = parseFloat(valStr) || 0;
    const basic = parseFloat(singleBasicSalary) || 0;
    if (gross > basic) {
      setSingleHra(String(gross - basic));
    }
    const pfVal = parseFloat(singlePf) || Math.min(1800, Math.round(basic * 0.12));
    const esicVal = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    setSingleEsic(String(esicVal));
    const ptVal = gross > 10000 ? 200 : (gross >= 7500 ? 175 : 0);
    setSinglePt(String(ptVal));
    const deductionsVal = pfVal + esicVal + ptVal;
    setSingleDeductions(String(deductionsVal));
    setSingleNetPay(String(gross - deductionsVal));
  };

  const handleDeductionsChange = (valStr: string) => {
    setSingleDeductions(valStr);
    const gross = parseFloat(singleGross) || 0;
    const deductions = parseFloat(valStr) || 0;
    setSingleNetPay(String(gross - deductions));
  };

  // -------------------------------------------------------------
  // 2. Bulk Excel Upload State
  // -------------------------------------------------------------
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ExcelValidationSummary | null>(null);
  const [previewList, setPreviewList] = useState<ExcelSalaryRecordPreview[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<BulkSendSummary | null>(null);
  const [sendDetails, setSendDetails] = useState<BulkSendResultDetail[]>([]);
  const [retrying, setRetrying] = useState(false);

  // -------------------------------------------------------------
  // 3. Employee Roster Multi-Select Bulk State
  // -------------------------------------------------------------
  const [rosterSearch, setRosterSearch] = useState('');
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);
  const [rosterMonth, setRosterMonth] = useState('August');
  const [rosterYear, setRosterYear] = useState('2026');
  const [confirmRosterModalOpen, setConfirmRosterModalOpen] = useState(false);
  const [sendingRoster, setSendingRoster] = useState(false);

  // -------------------------------------------------------------
  // 4. Logs State
  // -------------------------------------------------------------
  const [logs, setLogs] = useState<SalarySlipLogRecord[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatusFilter, setLogsStatusFilter] = useState('');

  // Fetch Employees from Database
  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('hrms_token');
      const res = await fetch('/api/v1/employees', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEmployeesList(json.data);
      }
    } catch (err) {
      console.error('Failed to load employees for salary slips:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch Logs
  const loadLogs = async () => {
    const data = await fetchSalarySlipLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadEmployees();
    loadLogs();
  }, []);

  useEffect(() => {
    if (activeView === 'logs') {
      loadLogs();
    }
  }, [activeView]);

  // Handle Employee Dropdown Selection in Manual Single Mode
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setSingleEmployeeId('');
      setSingleEmployeeName('');
      setSingleEmployeeEmail('');
      setSingleDesignation('');
      setSingleDepartment('');
      return;
    }
    const emp = employeesList.find((e) => (e.id || e.employeeId) === empId);
    if (emp) {
      setSingleEmployeeId(emp.employeeId || emp.emp_code || emp.id || '');
      setSingleEmployeeName(emp.fullName || emp.name || '');
      setSingleEmployeeEmail(emp.email || '');
      setSingleDesignation(emp.designation || '');
      setSingleDepartment(emp.department || emp.department_name || '');
      // Auto-fill salary if exists or for EMP-0001 / Sample Employee from Image 2
      const candidateSalary = (emp as any).salaryDetails?.basicSalary || (emp as any).basicSalary;
      if (candidateSalary) {
        calculateBreakdownFromBasic(String(candidateSalary));
      } else if (emp.employeeId === 'EMP-0001' || emp.emp_code === 'EMP-0001' || (emp.fullName && emp.fullName.toLowerCase().includes('abhishek'))) {
        calculateBreakdownFromBasic('16205');
      }
    }
  };

  // Handle Single Salary Slip Dispatch
  const handleSendSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmployeeId || !singleEmployeeEmail || !singleMonth || !singleYear) {
      setErrorMsg('Employee ID, Recipient Email, Month, and Year are required.');
      return;
    }

    setSendingSingle(true);
    setErrorMsg(null);

    const res = await sendSingleSalarySlip(
      {
        employeeId: singleEmployeeId,
        employeeName: singleEmployeeName || singleEmployeeId,
        employeeEmail: singleEmployeeEmail,
        salaryMonth: singleMonth,
        salaryYear: singleYear,
        basicSalary: singleBasicSalary ? parseFloat(singleBasicSalary) : undefined,
        hra: singleHra ? parseFloat(singleHra) : undefined,
        totalEarnings: singleGross ? parseFloat(singleGross) : undefined,
        totalDeductions: singleDeductions ? parseFloat(singleDeductions) : undefined,
        netPayableSalary: singleNetPay ? parseFloat(singleNetPay) : undefined,
      },
      singleSlipFile
    );

    setSendingSingle(false);

    if (res.success) {
      addNotification({
        type: 'PAYROLL',
        title: 'Salary Slip Dispatched',
        message: res.message || `Salary slip sent successfully to ${singleEmployeeName || singleEmployeeId}.`,
        link: '/salary-slips',
      });
      setToastMsg(res.message || `Salary slip sent successfully to ${singleEmployeeEmail}!`);
      // Reload logs so new entry is immediately recorded
      loadLogs();
      setTimeout(() => setToastMsg(null), 6000);
    } else {
      setErrorMsg(res.error || 'Failed to dispatch salary slip email.');
    }
  };

  // Handle Excel Upload Selection
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

  // Validate Excel
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

  // Confirm and Send Bulk from Excel
  const handleConfirmSendBulk = async () => {
    setConfirmModalOpen(false);
    setSending(true);
    setErrorMsg(null);

    const validItems = previewList.filter((item) => item.isValid);
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
      loadLogs();
      setTimeout(() => setToastMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to process bulk salary slip emails.');
    }
  };

  // Confirm and Send Bulk from Employee Roster
  const handleConfirmSendRosterBulk = async () => {
    setConfirmRosterModalOpen(false);
    setSendingRoster(true);
    setErrorMsg(null);

    const selectedEmployees = employeesList.filter((e) =>
      selectedRosterIds.includes(e.id || e.employeeId)
    );

    const items: ExcelSalaryRecordPreview[] = selectedEmployees.map((emp) => ({
      employeeId: emp.employeeId || emp.emp_code || emp.id || 'N/A',
      employeeName: emp.fullName || emp.name || 'N/A',
      employeeEmail: emp.email || '',
      salaryMonth: rosterMonth,
      salaryYear: rosterYear,
      salarySlipFile: 'Standard Company Salary Slip',
      isValid: Boolean(emp.email && emp.email.includes('@')),
    }));

    const res = await sendBulkSalarySlips(items.filter((i) => i.isValid));
    setSendingRoster(false);

    if (res.success && res.summary && res.details) {
      addNotification({
        type: 'PAYROLL',
        title: 'Bulk Salary Slips Dispatched',
        message: `${res.summary.sent} salary slips sent to selected employees.`,
        link: '/salary-slips',
      });
      setBulkSummary(res.summary);
      setSendDetails(res.details);
      setToastMsg(`Dispatched! ${res.summary.sent} sent successfully, ${res.summary.failed} failed.`);
      loadLogs();
      setTimeout(() => setToastMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to dispatch salary slips to selected employees.');
    }
  };

  // Retry Failed
  const handleRetryFailed = async () => {
    setRetrying(true);
    setErrorMsg(null);

    const res = await retryFailedSalarySlips();
    setRetrying(false);

    if (res.success) {
      setToastMsg(res.message || 'Failed salary slip emails re-sent successfully!');
      await loadLogs();
      setTimeout(() => setToastMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to retry salary slip emails.');
    }
  };

  // Filtered Roster Employees
  const filteredRosterEmployees = employeesList.filter((emp) => {
    if (!rosterSearch.trim()) return true;
    const q = rosterSearch.toLowerCase();
    const name = (emp.fullName || emp.name || '').toLowerCase();
    const code = (emp.employeeId || emp.emp_code || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const dept = (emp.department || emp.department_name || '').toLowerCase();
    return name.includes(q) || code.includes(q) || email.includes(q) || dept.includes(q);
  });

  const toggleSelectAllRoster = () => {
    if (selectedRosterIds.length === filteredRosterEmployees.length) {
      setSelectedRosterIds([]);
    } else {
      setSelectedRosterIds(filteredRosterEmployees.map((e) => e.id || e.employeeId));
    }
  };

  const toggleRosterEmployee = (id: string) => {
    setSelectedRosterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !logsSearch.trim() ||
      (log.employeeName || '').toLowerCase().includes(logsSearch.toLowerCase()) ||
      (log.employeeId || '').toLowerCase().includes(logsSearch.toLowerCase()) ||
      (log.employeeEmail || '').toLowerCase().includes(logsSearch.toLowerCase());
    const matchesStatus = !logsStatusFilter || log.status === logsStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Studio Header & Workflow Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '16px',
          color: '#FFFFFF',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <Mail size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Salary Slip Email & Dispatch Command
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
                Dispatch official salary slips via email individually or in bulk with duplicate protection and audit tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Navigation Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setActiveView('single')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeView === 'single' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={15} /> Send Single (Manual)
          </button>

          <button
            onClick={() => setActiveView('upload')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeView === 'upload' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <FileSpreadsheet size={15} /> Bulk Upload (Excel)
          </button>

          <button
            onClick={() => setActiveView('roster')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeView === 'roster' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <Users size={15} /> Select Employees (Bulk)
          </button>

          <button
            onClick={() => setActiveView('logs')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeView === 'logs' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={15} /> Delivery Logs ({logs.length})
          </button>
        </div>
      </div>

      {toastMsg && (
        <Alert variant="success" title="Success Notification">
          {toastMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="error" title="Validation / Processing Notice">
          {errorMsg}
        </Alert>
      )}

      {/* =============================================================
          VIEW 1: SEND SINGLE SALARY SLIP (MANUAL / INDIVIDUAL DISPATCH)
         ============================================================= */}
      {activeView === 'single' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Form Column */}
          <Card style={{ padding: '1.5rem', borderLeft: '4px solid #3B82F6' }}>
            <CardHeader style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="#3B82F6" />
                  Manual Individual Salary Slip Dispatch
                </CardTitle>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Send an official salary slip email directly to an employee with optional custom salary breakdown and PDF attachment.
                </p>
              </div>
            </CardHeader>

            <CardBody>
              <form onSubmit={handleSendSingle} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Employee Selection Quick Picker */}
                <div style={{ background: 'var(--bg-sidebar)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Select from HRMS Employee Directory (Auto-Fills Details):
                  </label>
                  <Select
                    value={selectedEmployeeId}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    options={[
                      { value: '', label: '-- Select Employee or Enter Below Manually --' },
                      ...employeesList.map((emp) => ({
                        value: emp.id || emp.employeeId,
                        label: `${emp.fullName || emp.name} (${emp.employeeId || emp.emp_code || 'EMP'}) — ${emp.designation || 'Staff'}`,
                      })),
                    ]}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    💡 Selecting an employee automatically fills their ID, Name, Email, and Department.
                  </span>
                </div>

                {/* Core Recipient Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Employee ID <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <Input
                      placeholder="e.g. EMP-0001"
                      value={singleEmployeeId}
                      onChange={(e) => setSingleEmployeeId(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Employee Full Name
                    </label>
                    <Input
                      placeholder="e.g. Sample Employee"
                      value={singleEmployeeName}
                      onChange={(e) => setSingleEmployeeName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Recipient Email Address <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="employee@company.com"
                      value={singleEmployeeEmail}
                      onChange={(e) => setSingleEmployeeEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Designation & Department
                    </label>
                    <Input
                      placeholder="e.g. IOT Developer / IoT Engineering"
                      value={singleDesignation ? `${singleDesignation} (${singleDepartment})` : ''}
                      onChange={(e) => setSingleDesignation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Pay Period Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Salary Month <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <Select
                      value={singleMonth}
                      onChange={(e) => setSingleMonth(e.target.value)}
                      options={MONTH_OPTIONS.map((m) => ({ value: m, label: m }))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Salary Year <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <Select
                      value={singleYear}
                      onChange={(e) => setSingleYear(e.target.value)}
                      options={YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
                      required
                    />
                  </div>
                </div>

                {/* Salary Breakdown Strip with Auto-Fill Logic from Image 2 & 3 */}
                <div style={{ padding: '16px', background: 'var(--bg-sidebar)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={16} color="#059669" />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>Salary Details (Auto-fills from Basic Salary)</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      ⚡ Auto-calculates all fields
                    </span>
                  </div>

                  {/* Row 1: Earnings (Basic, HRA, Gross) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '2px', color: 'var(--primary-600)' }}>
                        Basic Salary (₹) *
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 16205"
                        value={singleBasicSalary}
                        onChange={(e) => calculateBreakdownFromBasic(e.target.value)}
                        style={{ border: '2px solid var(--primary-500)', fontWeight: 700 }}
                      />
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Type basic to auto-fill all items</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>HRA (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 2405"
                        value={singleHra}
                        onChange={(e) => handleHraChange(e.target.value)}
                      />
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Auto-calculated (HRA)</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Gross Earnings (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 18610"
                        value={singleGross}
                        onChange={(e) => handleGrossChange(e.target.value)}
                      />
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Basic + HRA</span>
                    </div>
                  </div>

                  {/* Row 2: Deductions (PF, ESIC, PT, Total Deductions) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px', color: '#DC2626' }}>Provident Fund (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 1800"
                        value={singlePf}
                        onChange={(e) => {
                          setSinglePf(e.target.value);
                          const pf = parseFloat(e.target.value) || 0;
                          const esic = parseFloat(singleEsic) || 0;
                          const pt = parseFloat(singlePt) || 0;
                          const tot = pf + esic + pt;
                          setSingleDeductions(String(tot));
                          const gross = parseFloat(singleGross) || 0;
                          setSingleNetPay(String(gross - tot));
                        }}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>12% (Max ₹1,800)</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px', color: '#DC2626' }}>ESIC (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 140"
                        value={singleEsic}
                        onChange={(e) => {
                          setSingleEsic(e.target.value);
                          const pf = parseFloat(singlePf) || 0;
                          const esic = parseFloat(e.target.value) || 0;
                          const pt = parseFloat(singlePt) || 0;
                          const tot = pf + esic + pt;
                          setSingleDeductions(String(tot));
                          const gross = parseFloat(singleGross) || 0;
                          setSingleNetPay(String(gross - tot));
                        }}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>0.75% of Gross</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px', color: '#DC2626' }}>Prof. Tax (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 200"
                        value={singlePt}
                        onChange={(e) => {
                          setSinglePt(e.target.value);
                          const pf = parseFloat(singlePf) || 0;
                          const esic = parseFloat(singleEsic) || 0;
                          const pt = parseFloat(e.target.value) || 0;
                          const tot = pf + esic + pt;
                          setSingleDeductions(String(tot));
                          const gross = parseFloat(singleGross) || 0;
                          setSingleNetPay(String(gross - tot));
                        }}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹200 / month</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px', color: '#DC2626' }}>Total Deductions (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 2140"
                        value={singleDeductions}
                        onChange={(e) => handleDeductionsChange(e.target.value)}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>PF + ESIC + PT</span>
                    </div>
                  </div>

                  {/* Row 3: Net Salary Paid Highlight Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(5, 150, 105, 0.08)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46', display: 'block' }}>Net Salary Paid (₹)</span>
                      {singleNetPay && (
                        <span style={{ fontSize: '11.5px', color: '#047857', fontStyle: 'italic' }}>
                          {convertToIndianWords(Number(singleNetPay))}
                        </span>
                      )}
                    </div>
                    <div style={{ width: '180px' }}>
                      <Input
                        type="number"
                        placeholder="e.g. 16470"
                        value={singleNetPay}
                        onChange={(e) => setSingleNetPay(e.target.value)}
                        style={{ fontWeight: 700, color: '#047857', fontSize: '16px', background: '#FFFFFF' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Salary Slip PDF Attachment Upload */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Attach Custom Salary Slip PDF (Optional):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSingleSlipFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '12px' }}
                    />
                    {singleSlipFile && (
                      <Badge variant="info">
                        📄 {singleSlipFile.name} ({(singleSlipFile.size / 1024).toFixed(1)} KB)
                      </Badge>
                    )}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    If no file is attached, a standard company PDF notice will accompany the notification.
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployeeId('');
                      setSingleEmployeeId('');
                      setSingleEmployeeName('');
                      setSingleEmployeeEmail('');
                      setSingleDesignation('');
                      setSingleDepartment('');
                      setSingleBasicSalary('');
                      setSingleHra('');
                      setSingleGross('');
                      setSinglePf('');
                      setSingleEsic('');
                      setSinglePt('');
                      setSingleDeductions('');
                      setSingleNetPay('');
                      setSingleSlipFile(null);
                    }}
                  >
                    Clear Form
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={sendingSingle}
                    disabled={sendingSingle || !singleEmployeeId || !singleEmployeeEmail}
                    icon={<Send size={16} />}
                  >
                    {sendingSingle ? 'Sending Salary Slip...' : 'Send Salary Slip Email'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Right Live Preview Card: Official Payslip Document Template (A4) + Email Simulation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card style={{ border: '1px solid #CBD5E1', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
              <CardHeader style={{ background: '#F8FAFC', padding: '12px 18px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                  {/* View Tabs */}
                  <div style={{ display: 'flex', gap: '4px', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('template')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: previewTab === 'template' ? '#FFFFFF' : 'transparent',
                        color: previewTab === 'template' ? '#0F172A' : '#64748B',
                        boxShadow: previewTab === 'template' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <FileText size={14} color={previewTab === 'template' ? '#2563EB' : '#64748B'} />
                      Official Payslip Template (A4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('email')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: previewTab === 'email' ? '#FFFFFF' : 'transparent',
                        color: previewTab === 'email' ? '#0F172A' : '#64748B',
                        boxShadow: previewTab === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Mail size={14} color={previewTab === 'email' ? '#2563EB' : '#64748B'} />
                      Email Body Simulation
                    </button>
                  </div>

                  {/* Print / Save PDF Button */}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handlePrintPayslip}
                    icon={<Printer size={14} />}
                  >
                    Print / Save PDF
                  </Button>
                </div>
              </CardHeader>
              <CardBody style={{ padding: '16px' }}>
                {previewTab === 'template' ? (
                  <div>
                    {/* Status hint */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '11.5px' }}>
                      <span style={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Payslip layout preview
                      </span>
                      <span style={{ color: '#64748B' }}>A4 Scaled Vector View</span>
                    </div>

                    {/* Scaled A4 Payslip Container with Exact Document Structure */}
                    <div
                      style={{
                        width: '100%',
                        maxHeight: '720px',
                        overflowY: 'auto',
                        overflowX: 'auto',
                        background: '#1E293B',
                        borderRadius: '10px',
                        padding: '20px 10px',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 'calc(210mm * 0.68)',
                          minHeight: 'calc(297mm * 0.68)',
                          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <div
                          id="official-payslip-print-container"
                          style={{
                            width: '210mm',
                            transform: 'scale(0.68)',
                            transformOrigin: 'top left',
                          }}
                        >
                          <PayslipPreview data={currentPayslipData} isEmbedded={true} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Email Header Simulation */}
                    <div style={{ background: '#0F172A', padding: '16px', textAlign: 'center', color: '#FFF' }}>
                      <div style={{ display: 'inline-block', background: '#3B82F6', width: '32px', height: '32px', lineHeight: '32px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
                        HR
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>Official Salary Slip Notification</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>HRMS Enterprise Workforce Management</div>
                    </div>

                    {/* Email Body Simulation */}
                    <div style={{ padding: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                      <p style={{ margin: '0 0 10px 0' }}>
                        Dear <strong>{singleEmployeeName || singleEmployeeId || '[Employee Name]'}</strong>,
                      </p>
                      <p style={{ margin: '0 0 14px 0', color: '#475569' }}>
                        Your official salary slip for <strong>{singleMonth} {singleYear}</strong> has been processed and is attached to this email.
                      </p>

                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748B' }}>Employee ID:</span>
                          <strong style={{ fontFamily: 'monospace' }}>{singleEmployeeId || 'EMP-0001'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748B' }}>Pay Period:</span>
                          <strong>{singleMonth} {singleYear}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748B' }}>Recipient:</span>
                          <span>{singleEmployeeEmail || 'employee@company.com'}</span>
                        </div>

                        {/* Salary Breakdown Summary Table matching Image 2 & 3 */}
                        {(singleBasicSalary || singleGross || singleNetPay) && (
                          <div style={{ marginTop: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#FFFFFF' }}>
                            <div style={{ background: '#F1F5F9', padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Salary Breakdown Summary
                            </div>
                            <div style={{ padding: '8px 10px', fontSize: '12px' }}>
                              {singleBasicSalary && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                <span style={{ color: '#64748B' }}>Basic Salary:</span>
                                <strong style={{ color: '#0F172A' }}>₹{Number(singleBasicSalary).toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {singleHra && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                <span style={{ color: '#64748B' }}>HRA:</span>
                                <strong>₹{Number(singleHra).toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {singleGross && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: '1px solid #F1F5F9' }}>
                                <span style={{ color: '#334155', fontWeight: 600 }}>Total Earnings:</span>
                                <strong style={{ color: '#0F172A' }}>₹{Number(singleGross).toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {singleDeductions && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                <span style={{ color: '#DC2626' }}>
                                  Total Deductions {singlePf ? `(PF ₹${singlePf} + ESIC ₹${singleEsic} + PT ₹${singlePt})` : ''}:
                                </span>
                                <strong style={{ color: '#DC2626' }}>-₹{Number(singleDeductions).toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {singleNetPay && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 2px 0', borderTop: '1px dashed #CBD5E1', marginTop: '4px' }}>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>Net Salary Paid:</span>
                                <strong style={{ color: '#16A34A', fontSize: '14px' }}>₹{Number(singleNetPay).toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {singleNetPay && (
                              <div style={{ fontSize: '10.5px', color: '#64748B', fontStyle: 'italic', marginTop: '3px', textAlign: 'right' }}>
                                {convertToIndianWords(Number(singleNetPay))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      <FileText size={16} color="#2563EB" />
                      <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>
                        {singleSlipFile ? singleSlipFile.name : `Salary_Slip_${singleEmployeeId || 'EMP'}_${singleMonth}_${singleYear}.pdf`}
                      </span>
                    </div>

                    <p style={{ margin: '14px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                      🛡️ Duplicate Protection Active: If a salary slip was already dispatched for this employee and period, sending again will be safely skipped.
                    </p>
                  </div>
                </div>
                )}
              </CardBody>
            </Card>

            {/* Quick Helper Banner */}
            <Card style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <CardBody style={{ padding: '16px', fontSize: '12px', color: '#475569' }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  📌 Need to send salary slips to multiple employees?
                </strong>
                Switch to the <strong>"Bulk Upload (Excel)"</strong> tab to import a spreadsheet, or use <strong>"Select Employees (Bulk)"</strong> to pick multiple team members with checkboxes.
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* =============================================================
          VIEW 2: BULK UPLOAD (EXCEL SPREADSHEET DISPATCH)
         ============================================================= */}
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

          {/* Excel Confirmation Modal */}
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

      {/* =============================================================
          VIEW 3: SELECT EMPLOYEES (BULK SEND DIRECT FROM DATABASE)
         ============================================================= */}
      {activeView === 'roster' && (
        <Card style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#10B981" />
                Select Employees from Directory for Bulk Dispatch
              </CardTitle>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Select multiple active employees using checkboxes to send salary slips in bulk without preparing an Excel sheet.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="primary"
                disabled={selectedRosterIds.length === 0 || sendingRoster}
                onClick={() => setConfirmRosterModalOpen(true)}
                icon={<Send size={16} />}
              >
                Dispatch to {selectedRosterIds.length} Selected
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            {/* Pay Period & Search Filter Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', background: 'var(--bg-sidebar)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Pay Period:</span>
                <Select
                  value={rosterMonth}
                  onChange={(e) => setRosterMonth(e.target.value)}
                  options={MONTH_OPTIONS.map((m) => ({ value: m, label: m }))}
                  style={{ width: '130px' }}
                />
                <Select
                  value={rosterYear}
                  onChange={(e) => setRosterYear(e.target.value)}
                  options={YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
                  style={{ width: '100px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '380px' }}>
                <Search size={16} color="var(--text-muted)" />
                <Input
                  placeholder="Filter employees by name, ID, department..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Selection Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button variant="secondary" size="sm" onClick={toggleSelectAllRoster} icon={selectedRosterIds.length === filteredRosterEmployees.length ? <CheckSquare size={14} /> : <Square size={14} />}>
                  {selectedRosterIds.length === filteredRosterEmployees.length ? 'Deselect All' : 'Select All Filtered'}
                </Button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Selected: <strong>{selectedRosterIds.length}</strong> of {filteredRosterEmployees.length} employees
                </span>
              </div>
            </div>

            {/* Employee Selection Table */}
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th style={{ width: '40px' }}></Th>
                    <Th>Employee ID</Th>
                    <Th>Full Name</Th>
                    <Th>Email Address</Th>
                    <Th>Department</Th>
                    <Th>Designation</Th>
                    <Th>Email Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredRosterEmployees.map((emp) => {
                    const id = emp.id || emp.employeeId;
                    const isSelected = selectedRosterIds.includes(id);
                    const hasValidEmail = Boolean(emp.email && emp.email.includes('@'));

                    return (
                      <Tr
                        key={id}
                        onClick={() => toggleRosterEmployee(id)}
                        style={{ cursor: 'pointer', background: isSelected ? 'rgba(59, 130, 246, 0.06)' : undefined }}
                      >
                        <Td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRosterEmployee(id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </Td>
                        <Td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {emp.employeeId || emp.emp_code || emp.id}
                        </Td>
                        <Td style={{ fontWeight: 600 }}>{emp.fullName || emp.name}</Td>
                        <Td>{emp.email || <span style={{ color: '#EF4444' }}>Missing Email</span>}</Td>
                        <Td>{emp.department || emp.department_name || 'General'}</Td>
                        <Td>{emp.designation || 'Staff'}</Td>
                        <Td>
                          {hasValidEmail ? (
                            <Badge variant="success">Deliverable</Badge>
                          ) : (
                            <Badge variant="error">Cannot Send</Badge>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>

            {/* Roster Bulk Confirmation Modal */}
            <Modal
              isOpen={confirmRosterModalOpen}
              onClose={() => setConfirmRosterModalOpen(false)}
              title="Confirm Employee Directory Bulk Dispatch"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Alert variant="warning" title="Bulk Dispatch Confirmation">
                  You are about to dispatch official salary slips for <strong>{rosterMonth} {rosterYear}</strong> to{' '}
                  <strong>{selectedRosterIds.length}</strong> selected employees.
                </Alert>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Each employee will receive their personalized pay notification. Duplicate protection ensures anyone who already received their slip for {rosterMonth} {rosterYear} will be safely skipped.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button variant="outline" onClick={() => setConfirmRosterModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleConfirmSendRosterBulk} icon={<Send size={16} />}>
                    Yes, Send Salary Slips Now
                  </Button>
                </div>
              </div>
            </Modal>
          </CardBody>
        </Card>
      )}

      {/* =============================================================
          VIEW 4: SALARY SLIP EMAIL DELIVERY LOGS
         ============================================================= */}
      {activeView === 'logs' && (
        <Card style={{ padding: '1.5rem' }}>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <CardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#3B82F6" />
                Salary Slip Email Logs & Delivery History ({logs.length})
              </CardTitle>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Audited real-time log of dispatched, failed, and duplicate-protected salary slip notifications.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" isLoading={retrying} onClick={handleRetryFailed} icon={<RefreshCw size={16} />}>
                Retry All Failed Emails
              </Button>
              <Button variant="secondary" onClick={loadLogs} icon={<RefreshCw size={16} />}>
                Refresh Logs
              </Button>
            </div>
          </CardHeader>

          <CardBody>
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '360px' }}>
                <Search size={16} color="var(--text-muted)" />
                <Input
                  placeholder="Filter logs by name, employee ID, email..."
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                />
              </div>

              <Select
                value={logsStatusFilter}
                onChange={(e) => setLogsStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Delivery Statuses' },
                  { value: 'SENT', label: 'Delivered (SENT)' },
                  { value: 'FAILED', label: 'Failed (FAILED)' },
                  { value: 'SKIPPED', label: 'Duplicate / Skipped' },
                ]}
                style={{ width: '180px' }}
              />
            </div>

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
                  {filteredLogs.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No delivery log records found matching the filter.
                      </Td>
                    </Tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <Tr key={log.id}>
                        <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.employeeId}</Td>
                        <Td style={{ fontWeight: 600 }}>{log.employeeName || log.employeeId}</Td>
                        <Td>{log.employeeEmail}</Td>
                        <Td>{log.salaryMonth} {log.salaryYear}</Td>
                        <Td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{log.emailSubject}</Td>
                        <Td>
                          <Badge
                            variant={
                              log.status === 'SENT'
                                ? 'success'
                                : log.status === 'SKIPPED'
                                ? 'neutral'
                                : log.status === 'PENDING'
                                ? 'warning'
                                : 'error'
                            }
                          >
                            {log.status}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: '0.8125rem' }}>
                          {log.status === 'SENT' ? (
                            <span style={{ color: 'var(--success-text)' }}>
                              {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Sent'}
                            </span>
                          ) : (
                            <span style={{ color: '#b91c1c' }}>{log.errorMessage || 'Failed'}</span>
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
      )}
    </div>
  );
};

export default SalarySlipBulkPage;
