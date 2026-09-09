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
  UserCheck,
  Award,
  LogOut,
  FileCheck,
  DollarSign,
  AlertTriangle,
  Layers,
  Settings,
  Upload,
  Eye,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  Tag,
  Copy,
  ArrowUp,
  ArrowDown,
  Scissors,
} from 'lucide-react';
import { MultiDocumentPreview } from '../../components/documents/MultiDocumentPreview';
import { buildNormalizedVariableMap, interpolateTemplateString, NormalizedDocumentData } from '../../utils/documentDataNormalizer';

function getAuthHeaders() {
  const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const MultiDocumentGeneratorStudio: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'create' | 'history' | 'templates'>('create');
  const [selectedDocType, setSelectedDocType] = useState<string>('APPOINTMENT_LETTER');

  // Per-Document Type Isolated State Map
  const [docTypeStateMap, setDocTypeStateMap] = useState<Record<string, any>>({
    OFFER_LETTER: {
      documentDate: '31/08/2026',
      employeeName: 'Abhishek Upadhyay',
      employeeCode: 'EMP-OFFER-001',
      salutation: 'Mr.',
      designation: 'IOT Developer',
      department: 'IoT & Embedded Engineering',
      employeeAddress: 'Flat 101, Absolute Motion Complex',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400701',
      workLocation: 'Navi Mumbai',
      joiningDate: '01/02/2024',
      reportingManager: 'Engineering Lead',
      reportingTime: '9:30 AM',
      probationPeriod: '6 months',
      workingHours: '9:30 AM to 6:30 PM',
      workingDays: 'Monday to Saturday',
      monthlyGross: 18600,
      annualCtc: 247476,
      basicSalary: 9300,
      hra: 4650,
      conveyanceAllowance: 1800,
      specialAllowance: 2850,
      otherAllowances: 0,
      includeSalaryAnnexure: true,
    },
    APPOINTMENT_LETTER: {
      documentDate: '31/08/2026',
      employeeName: 'Jake Willms',
      employeeCode: 'EMP-APPT-001',
      salutation: 'Mr.',
      designation: 'Data Analyst',
      department: 'Engineering',
      employeeAddress: 'Flat 402, Green Park Avenue',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400701',
      workLocation: 'MIDC Industrial Area, Navi Mumbai',
      joiningDate: '01/09/2026',
      reportingManager: 'Engineering Manager',
      reportingTime: '9:30 AM',
      probationPeriod: '6 months',
      workingHours: '9:30 AM to 6:30 PM',
      workingDays: 'Monday to Saturday',
      monthlyGross: 50000,
      annualCtc: 600000,
      basicSalary: 25000,
      hra: 12500,
      conveyanceAllowance: 2500,
      specialAllowance: 5000,
      otherAllowances: 5000,
      includeSalaryAnnexure: true,
    },
    LEAVING_CERTIFICATE: {
      documentDate: '31/08/2026',
      employeeName: 'Sarah Connor',
      employeeCode: 'EMP-LC-002',
      salutation: 'Ms.',
      designation: 'Senior QA Engineer',
      department: 'Quality Assurance',
      joiningDate: '15/01/2022',
      leavingDate: '31/08/2026',
      reasonForLeaving: 'Personal reasons / Career advancement',
      conductRating: 'Good and Satisfactory',
    },
    EXPERIENCE_CERTIFICATE: {
      documentDate: '31/08/2026',
      employeeName: 'David Miller',
      employeeCode: 'EMP-EXP-003',
      salutation: 'Mr.',
      designation: 'Full Stack Developer',
      department: 'Software Engineering',
      joiningDate: '01/06/2021',
      leavingDate: '31/08/2026',
      experiencePeriod: '5 Years 2 Months',
      mainTasks: 'building scalable cloud web applications, microservices, and leading team code reviews',
    },
    RELIEVING_LETTER: {
      documentDate: '31/08/2026',
      employeeName: 'Emily Watson',
      employeeCode: 'EMP-REL-004',
      salutation: 'Mrs.',
      designation: 'Product Manager',
      department: 'Product Management',
      joiningDate: '10/10/2020',
      relievingDate: '31/08/2026',
      resignationDate: '01/08/2026',
      acceptanceDate: '05/08/2026',
    },
    SALARY_CERTIFICATE: {
      documentDate: '31/08/2026',
      employeeName: 'Michael Chang',
      employeeCode: 'EMP-SAL-005',
      salutation: 'Mr.',
      designation: 'Financial Analyst',
      department: 'Finance & Accounting',
      joiningDate: '01/03/2023',
      monthlyGross: 75000,
      annualCtc: 900000,
      basicSalary: 37500,
      hra: 18750,
      conveyanceAllowance: 3000,
      specialAllowance: 15750,
      purposeText: 'Official banking verification / Housing loan processing',
    },
    PAYSLIP: {
      payMonthYear: 'Aug 2026',
      employeeName: 'ABHISHEK UPADHYAY',
      employeeCode: 'AMPL-00088',
      salutation: 'Mr.',
      designation: 'IOT Developer',
      department: 'IoT Engineering',
      workedDays: '28.00',
      joiningDate: '1-Nov-2025',
      uanNo: '102215947068',
      prevBalLeaves: '5.50',
      enjoyedLeaves: '4.50',
      balanceLeaves: '1.00',
      balanceWoff: '-',
      basicSalary: 16205,
      hra: 2405,
      lta: 0,
      arrears: 0,
      otherAllowance: 0,
      providentFund: 1800,
      esic: 140,
      mlwf: 0,
      professionalTax: 200,
      advanceLoan: 0,
      tds: 0,
      paymentMode: 'Bank Transfer',
      bankAccountNo: '060222010003352',
      bankName: 'Union Bank of India',
      dateOfBirth: '20-Jul-2004',
      documentDate: '31/08/2026',
    },
    WARNING_LETTER: {
      documentDate: '31/08/2026',
      employeeName: 'Robert Vance',
      employeeCode: 'EMP-WARN-006',
      salutation: 'Mr.',
      designation: 'Junior Specialist',
      department: 'Operations',
      joiningDate: '01/11/2025',
      warningSubject: 'Notice for Unauthorized Absence & Insubordination',
      issueDescription: 'It has been brought to management notice that you were absent from duty without prior intimation from 28th August 2026 to 30th August 2026.',
      responseDeadlineHours: 48,
    },
  });

  // Employee Selection & Input Mode (Edit & Fill vs Manual Entry)
  const [inputMode, setInputMode] = useState<'autofill' | 'manual'>('autofill');
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('Abhishek Upadhyay');
  const [employeeCode, setEmployeeCode] = useState('EMP-OFFER-001');
  const [salutation, setSalutation] = useState('Mr.');
  const [designation, setDesignation] = useState('IOT Developer');
  const [department, setDepartment] = useState('IoT & Embedded Engineering');
  const [documentDate, setDocumentDate] = useState('31/08/2026');
  const [employeeAddress, setEmployeeAddress] = useState('Flat 101, Absolute Motion Complex');
  const [city, setCity] = useState('Navi Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('400701');
  const [workLocation, setWorkLocation] = useState('Navi Mumbai');
  const [reportingManager, setReportingManager] = useState('Engineering Lead');
  const [reportingTime, setReportingTime] = useState('9:30 AM');
  const [probationPeriod, setProbationPeriod] = useState('6 months');
  const [workingHours, setWorkingHours] = useState('9:30 AM to 6:30 PM');
  const [workingDays, setWorkingDays] = useState('Monday to Saturday');

  // Document Specific Dates & Strings
  const [joiningDate, setJoiningDate] = useState('01/02/2024');
  const [leavingDate, setLeavingDate] = useState('31/08/2026');
  const [mainTasks, setMainTasks] = useState('analyzing data, creating reports, and assisting in strategic decision-making processes');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogoText, setCompanyLogoText] = useState('');
  const [relievingDate, setRelievingDate] = useState('31/08/2026');
  const [resignationDate, setResignationDate] = useState('01/08/2026');
  const [acceptanceDate, setAcceptanceDate] = useState('31/08/2026');
  const [experiencePeriod, setExperiencePeriod] = useState('3 Years');
  const [reasonForLeaving, setReasonForLeaving] = useState('Personal reasons / Career advancement');
  const [conductRating, setConductRating] = useState('Good and Satisfactory');
  const [purposeText, setPurposeText] = useState('Official verification / Bank loan processing');
  const [warningSubject, setWarningSubject] = useState('Notice for Unauthorized Absence & Insubordination');
  const [issueDescription, setIssueDescription] = useState('It has been brought to management notice that you were absent from duty without prior intimation from 28th August 2026 to 30th August 2026.');
  const [responseDeadlineHours, setResponseDeadlineHours] = useState<number>(48);

  // Payslip Specific Fields
  const [payMonthYear, setPayMonthYear] = useState('Aug 2026');
  const [workedDays, setWorkedDays] = useState('28.00');
  const [uanNo, setUanNo] = useState('102215947068');
  const [prevBalLeaves, setPrevBalLeaves] = useState('5.50');
  const [enjoyedLeaves, setEnjoyedLeaves] = useState('4.50');
  const [balanceLeaves, setBalanceLeaves] = useState('1.00');
  const [balanceWoff, setBalanceWoff] = useState('-');
  const [lta, setLta] = useState<number>(0);
  const [arrears, setArrears] = useState<number>(0);
  const [otherAllowance, setOtherAllowance] = useState<number>(0);
  const [providentFund, setProvidentFund] = useState<number>(1800);
  const [esic, setEsic] = useState<number>(140);
  const [mlwf, setMlwf] = useState<number>(0);
  const [professionalTax, setProfessionalTax] = useState<number>(200);
  const [advanceLoan, setAdvanceLoan] = useState<number>(0);
  const [tds, setTds] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [bankAccountNo, setBankAccountNo] = useState('060222010003352');
  const [bankName, setBankName] = useState('Union Bank of India');
  const [dateOfBirth, setDateOfBirth] = useState('20-Jul-2004');

  // Custom Template Body & Text Clauses State (100% Customizable)
  const [letterTitle, setLetterTitle] = useState('OFFER LETTER');
  const [customSubject, setCustomSubject] = useState('Subject: Offer of Employment for {{designation}}');
  const [customOpeningText, setCustomOpeningText] = useState('We are pleased to offer you the position of {{designation}} at {{company_name}}. Following our recent discussions, we are confident that your skills and experience make you an excellent fit for our team.');
  const [customClauses, setCustomClauses] = useState<Array<{ title: string; text: string; enabled?: boolean }>>([
    { title: 'Offer Terms & Position', text: 'We are pleased to offer you the position of {{designation}} in {{department}} department effective from {{joining_date}}.', enabled: true },
    { title: 'Compensation Package', text: 'Your total annual compensation (Cost to Company) will be {{annual_ctc}} per annum (Monthly Gross: {{monthly_gross_salary}}), payable monthly in accordance with company payroll policies.', enabled: true },
    { title: 'Working Hours & Location', text: 'You will adhere to standard working hours of {{working_hours}} from {{working_days}} at {{work_location}}.', enabled: true },
    { title: 'Confidentiality & Compliance', text: 'You shall maintain strict confidentiality regarding all company proprietary information and adhere to company policies.', enabled: true },
  ]);
  const [customClosingText, setCustomClosingText] = useState('We look forward to welcoming you to {{company_name}} and wish you a successful career with us.');

  // Salary Details
  const [monthlyGross, setMonthlyGross] = useState<number>(18600);
  const [annualCtc, setAnnualCtc] = useState<number>(247476);
  const [basicSalary, setBasicSalary] = useState<number>(9300);
  const [hra, setHra] = useState<number>(4650);
  const [conveyanceAllowance, setConveyanceAllowance] = useState<number>(1800);
  const [specialAllowance, setSpecialAllowance] = useState<number>(2850);
  const [otherAllowances, setOtherAllowances] = useState<number>(0);
  const [includeSalaryAnnexure, setIncludeSalaryAnnexure] = useState(true);

  // Company Details
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [companyCin, setCompanyCin] = useState('');
  const [companyGstin, setCompanyGstin] = useState('');
  const [companyPan, setCompanyPan] = useState('');
  const [registeredOffice, setRegisteredOffice] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [hrName, setHrName] = useState('');
  const [hrDesignation, setHrDesignation] = useState('Authorized Signatory');

  // Preview & Generation State
  const [previewMode, setPreviewMode] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.85);
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');

  // Company Letterhead System State
  const [activeLetterhead, setActiveLetterhead] = useState<any>(null);
  const [letterheadHistory, setLetterheadHistory] = useState<any[]>([]);
  const [letterheadFile, setLetterheadFile] = useState<File | null>(null);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [margins, setMargins] = useState({ top: 25, bottom: 25, left: 20, right: 20 });
  const [letterheadSettings, setLetterheadSettings] = useState({
    requireLetterhead: false,
    allowHrReplace: true,
    allowHrEditCompanyDetails: true,
  });

  useEffect(() => {
    fetchCompanyDetails();
    fetchEmployeesList();
    fetchHistory();
    fetchActiveLetterhead();
    fetchLetterheadHistory();
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      const res = await fetch('/api/v1/companies', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const cmp = json.data[0];
        if (cmp.name) setCompanyName(cmp.name);
        if (cmp.worksAddress || cmp.registeredAddress) setCompanyAddress(cmp.worksAddress || cmp.registeredAddress);
        if (cmp.registeredAddress) setRegisteredOffice(cmp.registeredAddress);
        if (cmp.cin) setCompanyCin(cmp.cin);
        if (cmp.gstin) setCompanyGstin(cmp.gstin);
        if (cmp.pan) setCompanyPan(cmp.pan);
        if (cmp.phone) setCompanyPhone(cmp.phone);
        if (cmp.email) setCompanyEmail(cmp.email);
        if (cmp.website) setCompanyWebsite(cmp.website);
        if (cmp.legalSuffix) setCompanyTagline(cmp.legalSuffix);
        if (cmp.logoPath) setCompanyLogo(cmp.logoPath);
      }
    } catch (err) {
      console.error('Failed to fetch company details:', err);
    }
  };

  const fetchActiveLetterhead = async () => {
    try {
      const res = await fetch('/api/v1/document-management/letterhead/active', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setActiveLetterhead(json.data || null);
        if (json.data?.margins) {
          setMargins(json.data.margins);
        }
        if (json.settings) {
          setLetterheadSettings(json.settings);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active letterhead:', err);
    }
  };

  const fetchLetterheadHistory = async () => {
    try {
      const res = await fetch('/api/v1/document-management/letterhead/history', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLetterheadHistory(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch letterhead history:', err);
    }
  };

  const handleUploadLetterhead = async () => {
    if (!letterheadFile) return;
    setUploadingLetterhead(true);
    setValidationError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', letterheadFile);

      const res = await fetch('/api/v1/document-management/letterhead/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || 'Letterhead uploaded successfully. Letterhead is now active.');
        setLetterheadFile(null);
        fetchActiveLetterhead();
        fetchLetterheadHistory();
      } else {
        setValidationError(json.error?.message || 'Failed to upload letterhead.');
      }
    } catch (err) {
      setValidationError('Network error occurred while uploading letterhead.');
    } finally {
      setUploadingLetterhead(false);
    }
  };

  const handleActivateLetterhead = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/document-management/letterhead/activate/${id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || 'Letterhead version activated.');
        fetchActiveLetterhead();
        fetchLetterheadHistory();
      } else {
        setValidationError(json.error?.message || 'Failed to activate letterhead.');
      }
    } catch (err) {
      setValidationError('Network error occurred.');
    }
  };

  const handleUpdateMargins = async () => {
    try {
      const res = await fetch('/api/v1/document-management/letterhead/margins', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(margins),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Content safe area margins updated successfully.');
        fetchActiveLetterhead();
      }
    } catch (err) {
      setValidationError('Failed to update margins.');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const res = await fetch('/api/v1/document-management/letterhead/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(letterheadSettings),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Company document policy settings updated.');
        fetchActiveLetterhead();
      }
    } catch (err) {
      setValidationError('Failed to update settings.');
    }
  };

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
      const res = await fetch('/api/v1/document-management/generator/history', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistoryList(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch document history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSetInputMode = (mode: 'autofill' | 'manual') => {
    setInputMode(mode);
    if (mode === 'manual') {
      setSelectedEmployeeId('');
      setSuccessMsg('Switched to Manual Entry mode. Enter document details manually below without automatic profile overwriting.');
    } else {
      setSuccessMsg('Switched to Edit & Fill mode. Select an employee to autofill existing profile data or edit fields freely.');
    }
  };

  const handleSelectExistingEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;

    if (inputMode === 'manual') {
      setInputMode('autofill');
    }

    const emp = employeesList.find((e) => e.id === empId || e.userId === empId || e.employeeId === empId);
    if (emp) {
      setEmployeeName(emp.fullName || emp.name || '');
      setEmployeeCode(emp.employeeId || emp.emp_code || '');
      setDesignation(emp.designation || 'Staff');
      setDepartment(emp.department || emp.department_name || 'General');
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
      setSuccessMsg(`Autofilled existing HRMS salary details for ${emp.fullName || emp.name || employeeName} (Gross: ₹${sal.toLocaleString()})`);
    } else {
      setMonthlyGross(50000);
      setAnnualCtc(600000);
      setBasicSalary(25000);
      setHra(12500);
      setConveyanceAllowance(2500);
      setSpecialAllowance(5000);
      setOtherAllowances(5000);
      setSuccessMsg('Autofilled standard default salary structure (Monthly Gross: ₹50,000 / CTC: ₹6,00,000).');
    }
  };

  const validateForm = () => {
    if (!employeeName.trim()) return 'Employee Name is required.';
    if (!employeeCode.trim()) return 'Employee ID is required.';

    if (selectedDocType === 'APPOINTMENT_LETTER' && !joiningDate.trim()) {
      return 'Date of Joining is required for Appointment Letter.';
    }
    if (selectedDocType === 'LEAVING_CERTIFICATE' && !leavingDate.trim()) {
      return 'Date of Leaving is required for Leaving Certificate.';
    }
    if (selectedDocType === 'RELIEVING_LETTER' && !relievingDate.trim()) {
      return 'Relieving Date is required for Relieving Letter.';
    }
    if (selectedDocType === 'WARNING_LETTER') {
      if (!warningSubject.trim()) return 'Subject is required for Warning Letter.';
      if (!issueDescription.trim()) return 'Issue / Incident Description is required for Warning Letter.';
    }
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
        document_type: selectedDocType,
        employee_id: selectedEmployeeId || undefined,
        salutation,
        employee_name: employeeName,
        employee_code: employeeCode,
        designation,
        department,
        document_date: documentDate,
        joining_date: joiningDate,
        leaving_date: leavingDate,
        relieving_date: relievingDate,
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
        document_data: {
          acceptance_date: acceptanceDate,
          resignation_date: resignationDate,
          experience_period: experiencePeriod,
          reason_for_leaving: reasonForLeaving,
          conduct_rating: conductRating,
          purpose_text: purposeText,
          subject: warningSubject,
          issue_description: issueDescription,
          response_deadline_hours: responseDeadlineHours,
          include_salary_annexure: includeSalaryAnnexure,
        },
        status: 'GENERATED',
      };

      const res = await fetch('/api/v1/document-management/generator/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Document for ${employeeName} generated successfully!`);
        fetchHistory();
        setPreviewMode(true);
      } else {
        setValidationError(json.error?.message || 'Failed to generate document.');
      }
    } catch (error) {
      setValidationError('Network error occurred while generating PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateFromHistory = (item: any) => {
    setSelectedDocType(item.documentType || 'APPOINTMENT_LETTER');
    setSelectedEmployeeId(item.userId || '');
    setEmployeeName(item.employeeName || '');
    setEmployeeCode(item.employeeCode || '');
    setDesignation(item.designation || '');
    setDepartment(item.department || 'General');
    if (item.joiningDate) setJoiningDate(item.joiningDate);
    if (item.leavingDate) setLeavingDate(item.leavingDate);
    if (item.relievingDate) setRelievingDate(item.relievingDate);
    if (item.documentDate) setDocumentDate(item.documentDate);
    if (item.hrName) setHrName(item.hrName);
    if (item.hrDesignation) setHrDesignation(item.hrDesignation);

    if (item.salaryDetails) {
      setMonthlyGross(item.salaryDetails.monthlyGross || 0);
      setAnnualCtc(item.salaryDetails.annualCtc || 0);
      setBasicSalary(item.salaryDetails.basicSalary || 0);
      setHra(item.salaryDetails.hra || 0);
      setConveyanceAllowance(item.salaryDetails.conveyanceAllowance || 0);
      setSpecialAllowance(item.salaryDetails.specialAllowance || 0);
      setOtherAllowances(item.salaryDetails.otherAllowances || 0);
    }

    if (item.documentData) {
      if (item.documentData.reason_for_leaving) setReasonForLeaving(item.documentData.reason_for_leaving);
      if (item.documentData.experience_period) setExperiencePeriod(item.documentData.experience_period);
      if (item.documentData.conduct_rating) setConductRating(item.documentData.conduct_rating);
      if (item.documentData.purpose_text) setPurposeText(item.documentData.purpose_text);
      if (item.documentData.subject) setWarningSubject(item.documentData.subject);
      if (item.documentData.issue_description) setIssueDescription(item.documentData.issue_description);
    }

    setActiveMainTab('create');
    setPreviewMode(false);
    setSuccessMsg(`Loaded details for ${item.employeeName} (${item.employeeCode}) to regenerate version.`);
  };

  const handleDocTypeChange = (newDocType: string) => {
    if (newDocType === selectedDocType) return;

    // 1. Save current input fields into docTypeStateMap[selectedDocType]
    const currentFieldsState = {
      documentDate,
      employeeName,
      employeeCode,
      salutation,
      designation,
      department,
      employeeAddress,
      city,
      state,
      pincode,
      workLocation,
      reportingManager,
      reportingTime,
      probationPeriod,
      workingHours,
      workingDays,
      joiningDate,
      leavingDate,
      relievingDate,
      resignationDate,
      acceptanceDate,
      experiencePeriod,
      reasonForLeaving,
      conductRating,
      purposeText,
      mainTasks,
      warningSubject,
      issueDescription,
      responseDeadlineHours,
      monthlyGross,
      annualCtc,
      basicSalary,
      hra,
      conveyanceAllowance,
      specialAllowance,
      otherAllowances,
      includeSalaryAnnexure,
      letterTitle,
      customSubject,
      customOpeningText,
      customClauses,
      customClosingText,
    };

    setDocTypeStateMap((prevMap) => ({
      ...prevMap,
      [selectedDocType]: {
        ...prevMap[selectedDocType],
        ...currentFieldsState,
      },
    }));

    // 2. Retrieve state for target document type
    const targetState = docTypeStateMap[newDocType] || {};

    setLetterTitle(targetState.letterTitle || (newDocType.replace(/_/g, ' ')));
    setCustomSubject(targetState.customSubject || `Subject: Regarding {{employee_full_name}} - ${newDocType.replace(/_/g, ' ')}`);
    setCustomOpeningText(targetState.customOpeningText || `This is to formally state that {{employee_full_name}} ({{employee_id}}) is associated with {{company_name}} as {{designation}}.`);
    setCustomClauses(targetState.customClauses || [
      { title: 'Terms & Conditions', text: 'All duties and responsibilities shall be governed by company policy.' },
      { title: 'Confidentiality', text: 'You shall maintain absolute confidentiality regarding company records.' },
    ]);
    setCustomClosingText(targetState.customClosingText || 'We look forward to your continued contribution and success with {{company_name}}.');

    setEmployeeName(targetState.employeeName || (newDocType === 'OFFER_LETTER' ? 'Abhishek Upadhyay' : 'Jake Willms'));
    setEmployeeCode(targetState.employeeCode || (newDocType === 'OFFER_LETTER' ? 'EMP-OFFER-001' : 'EMP-APPT-001'));
    setSalutation(targetState.salutation || 'Mr.');
    setDesignation(targetState.designation || (newDocType === 'OFFER_LETTER' ? 'IOT Developer' : 'Data Analyst'));
    setDepartment(targetState.department || (newDocType === 'OFFER_LETTER' ? 'IoT & Embedded Engineering' : 'Engineering'));
    setDocumentDate(targetState.documentDate || '31/08/2026');
    setEmployeeAddress(targetState.employeeAddress || 'Flat 402, Green Park Avenue');
    setCity(targetState.city || 'Navi Mumbai');
    setState(targetState.state || 'Maharashtra');
    setPincode(targetState.pincode || '400701');
    setWorkLocation(targetState.workLocation || 'MIDC Industrial Area, Navi Mumbai');
    setReportingManager(targetState.reportingManager || 'Engineering Manager');
    setReportingTime(targetState.reportingTime || '9:30 AM');
    setProbationPeriod(targetState.probationPeriod || '6 months');
    setWorkingHours(targetState.workingHours || '9:30 AM to 6:30 PM');
    setWorkingDays(targetState.workingDays || 'Monday to Saturday');

    setJoiningDate(targetState.joiningDate || '01/09/2026');
    setLeavingDate(targetState.leavingDate || '31/08/2026');
    setRelievingDate(targetState.relievingDate || '31/08/2026');
    setResignationDate(targetState.resignationDate || '01/08/2026');
    setAcceptanceDate(targetState.acceptanceDate || '31/08/2026');
    setExperiencePeriod(targetState.experiencePeriod || '3 Years');
    setReasonForLeaving(targetState.reasonForLeaving || 'Personal reasons / Career advancement');
    setConductRating(targetState.conductRating || 'Good and Satisfactory');
    setPurposeText(targetState.purposeText || 'Official verification / Bank loan processing');
    setMainTasks(targetState.mainTasks || 'analyzing data, creating reports');
    setWarningSubject(targetState.warningSubject || 'Notice for Unauthorized Absence & Insubordination');
    setIssueDescription(targetState.issueDescription || 'It has been brought to management notice...');
    setResponseDeadlineHours(targetState.responseDeadlineHours || 48);

    setMonthlyGross(targetState.monthlyGross !== undefined ? targetState.monthlyGross : 50000);
    setAnnualCtc(targetState.annualCtc !== undefined ? targetState.annualCtc : 600000);
    setBasicSalary(targetState.basicSalary !== undefined ? targetState.basicSalary : 25000);
    setHra(targetState.hra !== undefined ? targetState.hra : 12500);
    setConveyanceAllowance(targetState.conveyanceAllowance !== undefined ? targetState.conveyanceAllowance : 2500);
    setSpecialAllowance(targetState.specialAllowance !== undefined ? targetState.specialAllowance : 5000);
    setOtherAllowances(targetState.otherAllowances !== undefined ? targetState.otherAllowances : 5000);
    setIncludeSalaryAnnexure(targetState.includeSalaryAnnexure !== undefined ? targetState.includeSalaryAnnexure : true);

    setSelectedDocType(newDocType);
    setValidationError(null);
    setSuccessMsg(null);
  };

  const handleSaveCurrentTemplate = async () => {
    setGenerating(true);
    setValidationError(null);
    setSuccessMsg(null);
    try {
      const currentData = getPreviewData();
      const res = await fetch('/api/v1/document-management/templates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          document_type: selectedDocType,
          name: `${selectedDocType.replace('_', ' ')} Master Template`,
          content: JSON.stringify(currentData),
          changeSummary: `Updated template for ${selectedDocType}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Template for ${selectedDocType} saved successfully (Version ${json.versionNumber || 1}).`);
      } else {
        setValidationError(json.error?.message || 'Failed to save template.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Error saving template.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddCustomClause = () => {
    setCustomClauses((prev) => [
      ...prev,
      { title: `Clause #${prev.length + 1}`, text: 'Enter clause text here for {{employee_full_name}}.' },
    ]);
  };

  const handleInsertPageBreak = () => {
    setCustomClauses((prev) => [
      ...prev,
      { title: 'Page Break', text: '{{page_break}}' },
    ]);
    setSuccessMsg('Inserted Page Break clause ✂️ into document template.');
  };

  const handleUpdateClause = (index: number, field: 'title' | 'text', val: string) => {
    setCustomClauses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveCustomClause = (index: number) => {
    setCustomClauses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveClause = (index: number, direction: -1 | 1) => {
    setCustomClauses((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleDuplicateClause = (index: number) => {
    setCustomClauses((prev) => {
      const next = [...prev];
      const source = next[index];
      const copy = {
        title: `${source.title} (Copy)`,
        text: source.text,
        enabled: source.enabled !== false,
      };
      next.splice(index + 1, 0, copy);
      return next;
    });
    setSuccessMsg('Duplicated clause successfully.');
  };

  const handleToggleEnableClause = (index: number) => {
    setCustomClauses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: next[index].enabled === false };
      return next;
    });
  };

  const getPreviewData = () => {
    const rawData: Partial<NormalizedDocumentData> = {
      salutation,
      employeeName,
      employeeCode,
      designation,
      department,
      joiningDate,
      acceptanceDate,
      leavingDate,
      relievingDate,
      resignationDate,
      workLocation,
      reportingManager,
      reportingTime,
      probationPeriod,
      workingHours,
      workingDays,
      employeeAddress,
      monthlyGross,
      annualCtc,
      basicSalary,
      hra,
      conveyanceAllowance,
      specialAllowance,
      otherAllowances,
      includeSalaryAnnexure,
      companyName,
      companyTagline,
      companyAddress,
      companyEmail,
      companyPhone,
      companyWebsite,
      companyCin,
      companyGstin,
      companyPan,
      registeredOffice,
      companyLogo,
      hrName,
      hrDesignation,
      documentDate,
      letterTitle,
      customSubject,
      customOpeningText,
      customClauses,
      customClosingText,
      reasonForLeaving,
      conductRating,
      experiencePeriod,
      mainTasks,
      purposeText,
      warningSubject,
      issueDescription,
      responseDeadlineHours,

      // Payslip fields
      payMonthYear,
      workedDays,
      uanNo,
      prevBalLeaves,
      enjoyedLeaves,
      balanceLeaves,
      balanceWoff,
      lta,
      arrears,
      otherAllowance,
      providentFund,
      esic,
      mlwf,
      professionalTax,
      advanceLoan,
      tds,
      paymentMode,
      bankAccountNo,
      bankName,
      dateOfBirth,
    };

    const variableMap = buildNormalizedVariableMap(rawData);

    const resolvedSubject = interpolateTemplateString(customSubject, variableMap);
    const resolvedOpeningText = interpolateTemplateString(customOpeningText, variableMap);
    const resolvedClosingText = interpolateTemplateString(customClosingText, variableMap);
    const resolvedClauses = (customClauses || [])
      .filter((c: any) => c.enabled !== false)
      .map((c: any) => ({
        title: interpolateTemplateString(c.title || '', variableMap),
        text: interpolateTemplateString(c.text || '', variableMap),
        body: interpolateTemplateString(c.text || '', variableMap),
      }));

    return {
      ...rawData,
      letterTitle: letterTitle || selectedDocType.replace(/_/g, ' '),
      customSubject: resolvedSubject,
      subject: resolvedSubject || warningSubject,
      customOpeningText: resolvedOpeningText,
      customClosingText: resolvedClosingText,
      customClauses: resolvedClauses,
      issueDescription: interpolateTemplateString(issueDescription || '', variableMap),
      reasonForLeaving: interpolateTemplateString(reasonForLeaving || '', variableMap),
      purposeText: interpolateTemplateString(purposeText || '', variableMap),
      letterDate: documentDate,
    };
  };

  const filteredHistory = historyList.filter((h) => {
    const matchesSearch =
      h.employeeName?.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.employeeCode?.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.designation?.toLowerCase().includes(historySearch.toLowerCase());
    const matchesType = !historyTypeFilter || h.documentType === historyTypeFilter;
    return matchesSearch && matchesType;
  });

  const docTypeOptions = [
    { type: 'OFFER_LETTER', name: 'Offer Letter (3-Page Reference PDF)', icon: <FileText size={18} />, color: '#0284C7' },
    { type: 'APPOINTMENT_LETTER', name: 'Appointment Letter', icon: <FileText size={18} />, color: '#3B82F6' },
    { type: 'PAYSLIP', name: 'Pay Slip (Salary Slip)', icon: <DollarSign size={18} />, color: '#059669' },
    { type: 'LEAVING_CERTIFICATE', name: 'Leaving Certificate', icon: <LogOut size={18} />, color: '#EF4444' },
    { type: 'EXPERIENCE_CERTIFICATE', name: 'Experience Certificate', icon: <Award size={18} />, color: '#10B981' },
    { type: 'RELIEVING_LETTER', name: 'Relieving Letter', icon: <FileCheck size={18} />, color: '#F59E0B' },
    { type: 'SALARY_CERTIFICATE', name: 'Salary Certificate', icon: <DollarSign size={18} />, color: '#8B5CF6' },
    { type: 'WARNING_LETTER', name: 'Warning / Show Cause', icon: <AlertTriangle size={18} />, color: '#DC2626' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Studio Banner */}
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
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              <Layers style={{ width: '24px', height: '24px', color: '#60A5FA' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Multi-Document Generator Studio
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 56px', color: '#94A3B8', fontSize: '14px' }}>
            Generate official, print-ready HR letters & certificates with live preview, version control, and template engine integration.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveMainTab('create')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeMainTab === 'create' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PlusCircle style={{ width: '16px', height: '16px' }} /> Generate Document
          </button>

          <button
            onClick={() => setActiveMainTab('history')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeMainTab === 'history' ? '#3B82F6' : 'transparent',
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

          <button
            onClick={() => setActiveMainTab('templates')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeMainTab === 'templates' ? '#3B82F6' : 'transparent',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Settings style={{ width: '16px', height: '16px' }} /> Document Settings
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

      {activeMainTab === 'create' && (
        <div>
          {/* Document Type Selector Dropdown */}
          <Card style={{ marginBottom: '24px', borderLeft: '4px solid #3B82F6' }}>
            <CardBody style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                  <FileText style={{ width: '22px', height: '22px' }} />
                </div>
                <div>
                  <label htmlFor="doc-type-select" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                    Select HR Document Type:
                  </label>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>
                    Choose document format to configure form fields & load live preview
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, maxWidth: '450px', minWidth: '260px' }}>
                <select
                  id="doc-type-select"
                  value={selectedDocType}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #3B82F6',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0F172A',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  {docTypeOptions.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.name} — ({opt.type === 'APPOINTMENT_LETTER' ? 'Reference PDF Template' : 'Standard HR Template'})
                    </option>
                  ))}
                </select>
              </div>
            </CardBody>
          </Card>

          {/* Direct Inline Company Letterhead Upload & Active Status Bar */}
          <Card style={{ marginBottom: '24px', borderLeft: '4px solid #10B981', background: 'rgba(16, 185, 129, 0.05)' }}>
            <CardBody style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: activeLetterhead ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeLetterhead ? '#10B981' : '#EF4444' }}>
                  <FileText style={{ width: '22px', height: '22px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '14px', fontWeight: 700 }}>
                      {activeLetterhead ? `Active Company Letterhead: ${activeLetterhead.fileName}` : 'No Company Letterhead Uploaded'}
                    </strong>
                    {activeLetterhead ? (
                      <Badge variant="success">v{activeLetterhead.version}.0 ACTIVE</Badge>
                    ) : (
                      <Badge variant="warning">NOT UPLOADED</Badge>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', opacity: 0.8, display: 'block', marginTop: '2px' }}>
                    {activeLetterhead
                      ? 'Applied automatically as official background layer across all generated HR documents & live preview'
                      : 'Upload your official company letterhead (A4 PDF or PNG/JPG) right here to apply to all documents.'}
                  </span>
                </div>
              </div>

              {/* Direct Inline Upload Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  id="inline-letterhead-file-input"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setLetterheadFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A' }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUploadLetterhead}
                  disabled={!letterheadFile || uploadingLetterhead}
                  icon={<Upload style={{ width: '14px', height: '14px' }} />}
                >
                  {uploadingLetterhead ? 'Uploading...' : 'Upload & Apply Letterhead'}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* 2-Column Studio Grid: Left Form & Right Live Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: previewMode ? '440px 1fr' : '1fr 1fr', gap: '24px' }}>
            {/* Left Column Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Option: Select Existing Employee / Filling Mode */}
              <Card style={{ borderLeft: '4px solid #3B82F6' }}>
                <CardBody style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserCheck style={{ width: '18px', height: '18px', color: '#3B82F6' }} />
                      <strong style={{ fontSize: '14px', color: '#0F172A' }}>Document Generator Mode</strong>
                    </div>

                    {/* Mode Action Buttons */}
                    <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                      <button
                        type="button"
                        onClick={() => handleSetInputMode('autofill')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: inputMode === 'autofill' ? '#3B82F6' : 'transparent',
                          color: inputMode === 'autofill' ? '#FFFFFF' : '#475569',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: inputMode === 'autofill' ? '0 2px 4px rgba(59,130,246,0.3)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Sparkles style={{ width: '14px', height: '14px' }} /> Edit & Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetInputMode('manual')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: inputMode === 'manual' ? '#3B82F6' : 'transparent',
                          color: inputMode === 'manual' ? '#FFFFFF' : '#475569',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: inputMode === 'manual' ? '0 2px 4px rgba(59,130,246,0.3)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Edit3 style={{ width: '14px', height: '14px' }} /> Manual Entry
                      </button>
                    </div>
                  </div>

                  {inputMode === 'autofill' ? (
                    <div>
                      <label htmlFor="employee-autofill-select" style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                        Select an existing employee profile to automatically populate fields (you can edit any value):
                      </label>
                      <select
                        id="employee-autofill-select"
                        value={selectedEmployeeId}
                        onChange={(e) => handleSelectExistingEmployee(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}
                      >
                        <option value="">-- Choose Employee Profile --</option>
                        {employeesList.map((emp) => (
                          <option key={emp.id || emp.userId || emp.employeeId} value={emp.id || emp.userId || emp.employeeId}>
                            {emp.fullName || emp.name} ({emp.employeeId || 'EMP'}) - {emp.designation || 'Staff'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1', fontSize: '12px', color: '#334155' }}>
                      ✍️ <strong>Manual Entry Mode Active:</strong> Fields can be typed manually. Entered values will remain intact and will not be overwritten automatically.
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Section 1: Common Employee Details */}
              <Card>
                <CardHeader><CardTitle style={{ fontSize: '15px' }}>1. Employee Details</CardTitle></CardHeader>
                <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1.4fr 1.1fr', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>Title</label>
                      <select
                        value={salutation}
                        onChange={(e) => setSalutation(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: 500,
                          backgroundColor: '#FFF',
                          color: '#0F172A',
                        }}
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                        Employee Full Name <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required />
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                        Employee ID <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Designation</label>
                      <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Department</label>
                      <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Document Date</label>
                    <Input value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} placeholder="e.g. November 28, 2050" />
                  </div>
                </CardBody>
              </Card>

              {/* Section 2: Document Specific Fields */}
              <Card>
                <CardHeader>
                  <CardTitle style={{ fontSize: '15px' }}>
                    2. Specific Details & Dynamic Variables for {docTypeOptions.find((d) => d.type === selectedDocType)?.name}
                  </CardTitle>
                </CardHeader>
                <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Dynamic Variables Insertion Panel */}
                  <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Available Dynamic Variable Placeholders (Click to copy):</span>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Grouped by Domain</span>
                    </div>

                    {[
                      {
                        group: 'EMPLOYEE',
                        tags: ['{{employee_full_name}}', '{{employee_id}}', '{{title}}', '{{designation}}', '{{department}}', '{{joining_date}}', '{{acceptance_date}}'],
                      },
                      {
                        group: 'SALARY',
                        tags: ['{{monthly_gross_salary}}', '{{annual_ctc}}', '{{basic_salary}}', '{{hra}}', '{{conveyance}}', '{{special_allowance}}', '{{other_allowances}}'],
                      },
                      {
                        group: 'COMPANY',
                        tags: ['{{company_name}}', '{{company_tagline}}', '{{company_address}}', '{{corporate_email}}', '{{corporate_phone}}', '{{website_domain}}', '{{cin}}', '{{gstin}}', '{{pan}}', '{{registered_office_address}}'],
                      },
                      {
                        group: 'SIGNATORY',
                        tags: ['{{authorized_person_name}}', '{{authorized_person_designation}}'],
                      },
                      {
                        group: 'OTHER',
                        tags: ['{{document_date}}', '{{probation_period}}', '{{work_location}}', '{{working_hours}}', '{{working_days}}', '{{page_break}}'],
                      },
                    ].map((grp) => (
                      <div key={grp.group} style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          {grp.group}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {grp.tags.map((tag) => {
                            const isPageBreak = tag === '{{page_break}}';
                            return (
                              <span
                                key={tag}
                                onClick={() => {
                                  navigator.clipboard.writeText(tag);
                                  setSuccessMsg(`Copied placeholder variable ${tag} to clipboard!`);
                                }}
                                style={{
                                  background: isPageBreak ? '#FEF2F2' : '#FFFFFF',
                                  border: isPageBreak ? '1.5px dashed #EF4444' : '1px solid #CBD5E1',
                                  borderRadius: '5px',
                                  padding: '3px 8px',
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  color: isPageBreak ? '#DC2626' : '#2563EB',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                }}
                                title={`Click to copy ${tag}`}
                              >
                                {isPageBreak && <span>✂️</span>}
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(selectedDocType === 'OFFER_LETTER' || selectedDocType === 'APPOINTMENT_LETTER') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          Date of Joining <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <Input value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} placeholder="DD/MM/YYYY" required />
                      </div>

                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Acceptance Date</label>
                        <Input value={acceptanceDate} onChange={(e) => setAcceptanceDate(e.target.value)} placeholder="DD/MM/YYYY" />
                      </div>
                    </div>
                  )}

                  {selectedDocType === 'LEAVING_CERTIFICATE' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date of Joining</label>
                          <Input value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Date of Leaving <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <Input value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} required />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason for Leaving</label>
                        <Input value={reasonForLeaving} onChange={(e) => setReasonForLeaving(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Conduct & Character Statement</label>
                        <Input value={conductRating} onChange={(e) => setConductRating(e.target.value)} />
                      </div>
                    </>
                  )}

                  {selectedDocType === 'EXPERIENCE_CERTIFICATE' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date of Joining</label>
                          <Input value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} placeholder="e.g. August 2050" />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date of Leaving</label>
                          <Input value={leavingDate} onChange={(e) => setLeavingDate(e.target.value)} placeholder="e.g. August 2053" />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Main Tasks & Key Responsibilities</label>
                        <textarea
                          value={mainTasks}
                          onChange={(e) => setMainTasks(e.target.value)}
                          placeholder="e.g. analyzing data, creating reports, and assisting in strategic decision-making processes"
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {selectedDocType === 'RELIEVING_LETTER' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Resignation Date</label>
                          <Input value={resignationDate} onChange={(e) => setResignationDate(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Relieving Date <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <Input value={relievingDate} onChange={(e) => setRelievingDate(e.target.value)} required />
                        </div>
                      </div>
                    </>
                  )}

                  {selectedDocType === 'SALARY_CERTIFICATE' && (
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Purpose Statement</label>
                      <Input value={purposeText} onChange={(e) => setPurposeText(e.target.value)} placeholder="e.g. Bank loan / Visa verification" />
                    </div>
                  )}

                  {selectedDocType === 'WARNING_LETTER' && (
                    <>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          Warning Subject <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <Input value={warningSubject} onChange={(e) => setWarningSubject(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                          Incident / Issue Description <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={issueDescription}
                          onChange={(e) => setIssueDescription(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Explanation Response Deadline (Hours)</label>
                        <Input type="number" value={responseDeadlineHours} onChange={(e) => setResponseDeadlineHours(Number(e.target.value))} />
                      </div>
                    </>
                  )}

                  {selectedDocType === 'PAYSLIP' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Pay Month & Year <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <Input value={payMonthYear} onChange={(e) => setPayMonthYear(e.target.value)} placeholder="e.g. Aug 2026" required />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Worked / Paid Days</label>
                          <Input value={workedDays} onChange={(e) => setWorkedDays(e.target.value)} placeholder="28.00" />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date of Joining</label>
                          <Input value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} placeholder="1-Nov-2025" />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>UAN Number</label>
                          <Input value={uanNo} onChange={(e) => setUanNo(e.target.value)} placeholder="102215947068" />
                        </div>
                      </div>

                      <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <strong style={{ fontSize: '12px', color: '#0F172A', display: 'block', marginBottom: '8px' }}>Leave Balances Summary</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Prev. Bal.</label>
                            <Input value={prevBalLeaves} onChange={(e) => setPrevBalLeaves(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>(-) Enjoyed</label>
                            <Input value={enjoyedLeaves} onChange={(e) => setEnjoyedLeaves(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>= Balance</label>
                            <Input value={balanceLeaves} onChange={(e) => setBalanceLeaves(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>W-Off Bal.</label>
                            <Input value={balanceWoff} onChange={(e) => setBalanceWoff(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <strong style={{ fontSize: '12px', color: '#0F172A', display: 'block', marginBottom: '8px' }}>Earnings & Deductions Breakdown</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', display: 'block', marginBottom: '6px' }}>EARNINGS (₹)</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div>
                                <label style={{ fontSize: '11px' }}>Basic Salary</label>
                                <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>HRA</label>
                                <Input type="number" value={hra} onChange={(e) => setHra(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>LTA</label>
                                <Input type="number" value={lta} onChange={(e) => setLta(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>Arrears</label>
                                <Input type="number" value={arrears} onChange={(e) => setArrears(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>Other Allowance</label>
                                <Input type="number" value={otherAllowance} onChange={(e) => setOtherAllowance(Number(e.target.value))} />
                              </div>
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', display: 'block', marginBottom: '6px' }}>DEDUCTIONS (₹)</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div>
                                <label style={{ fontSize: '11px' }}>Provident Fund (PF)</label>
                                <Input type="number" value={providentFund} onChange={(e) => setProvidentFund(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>ESIC</label>
                                <Input type="number" value={esic} onChange={(e) => setEsic(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>MLWF</label>
                                <Input type="number" value={mlwf} onChange={(e) => setMlwf(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>Professional Tax (PT)</label>
                                <Input type="number" value={professionalTax} onChange={(e) => setProfessionalTax(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>Advance / Loan</label>
                                <Input type="number" value={advanceLoan} onChange={(e) => setAdvanceLoan(Number(e.target.value))} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px' }}>TDS</label>
                                <Input type="number" value={tds} onChange={(e) => setTds(Number(e.target.value))} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank Name</label>
                          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bank Account No.</label>
                          <Input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                          <Input value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} placeholder="Bank Transfer" />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date of Birth</label>
                          <Input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder="20-Jul-2004" />
                        </div>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>

              {/* Section 3: Template Text & Clause Customizer (100% Customizable) */}
              <Card style={{ borderLeft: '4px solid #7C3AED' }}>
                <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle style={{ fontSize: '15px', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 style={{ width: '18px', height: '18px' }} />
                    3. Customize Document Body Text & Clauses
                  </CardTitle>
                  <Badge variant="info">100% CUSTOMIZABLE</Badge>
                </CardHeader>
                <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Document Header Title
                    </label>
                    <Input
                      value={letterTitle}
                      onChange={(e) => setLetterTitle(e.target.value)}
                      placeholder="e.g. APPOINTMENT LETTER / OFFER LETTER"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Document Subject Line
                    </label>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="e.g. Subject: Appointment as {{designation}}"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Opening Paragraph / Main Body Text
                    </label>
                    <textarea
                      value={customOpeningText}
                      onChange={(e) => setCustomOpeningText(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                      }}
                      placeholder="Enter custom opening statement or letter body text with {{placeholders}}..."
                    />
                  </div>

                  {/* Custom Clauses Editor */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                        Custom Document Clauses & Terms ({customClauses.length})
                      </strong>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleInsertPageBreak}
                          icon={<Scissors style={{ width: '14px', height: '14px', color: '#DC2626' }} />}
                          style={{ border: '1px dashed #EF4444', color: '#DC2626', background: '#FEF2F2' }}
                        >
                          Insert Page Break
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddCustomClause}
                          icon={<Plus style={{ width: '14px', height: '14px' }} />}
                        >
                          Add Clause
                        </Button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {customClauses.map((clause, idx) => {
                        const isPageBreak = clause.text === '{{page_break}}' || clause.title === 'Page Break';
                        const isEnabled = clause.enabled !== false;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '12px',
                              background: isPageBreak ? '#FEF2F2' : isEnabled ? '#F8FAFC' : '#F1F5F9',
                              borderRadius: '8px',
                              border: isPageBreak ? '1.5px dashed #EF4444' : isEnabled ? '1px solid #E2E8F0' : '1px solid #CBD5E1',
                              opacity: isEnabled ? 1 : 0.6,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: isPageBreak ? '#DC2626' : '#7C3AED', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isPageBreak ? <span>✂️ PAGE BREAKER (Page splits here)</span> : <span>Clause #{idx + 1}</span>}
                                {!isEnabled && <Badge variant="warning">DISABLED</Badge>}
                              </span>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  title={isEnabled ? 'Disable Clause' : 'Enable Clause'}
                                  onClick={() => handleToggleEnableClause(idx)}
                                >
                                  {isEnabled ? <Eye style={{ width: '12px', height: '12px' }} /> : <Eye style={{ width: '12px', height: '12px', opacity: 0.4 }} />}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  title="Duplicate Clause"
                                  onClick={() => handleDuplicateClause(idx)}
                                  icon={<Copy style={{ width: '12px', height: '12px' }} />}
                                />
                                <Button variant="secondary" size="sm" disabled={idx === 0} onClick={() => handleMoveClause(idx, -1)}>↑</Button>
                                <Button variant="secondary" size="sm" disabled={idx === customClauses.length - 1} onClick={() => handleMoveClause(idx, 1)}>↓</Button>
                                <Button variant="danger" size="sm" onClick={() => handleRemoveCustomClause(idx)} icon={<Trash2 style={{ width: '12px', height: '12px' }} />} />
                              </div>
                            </div>
                            <Input
                              value={clause.title}
                              onChange={(e) => handleUpdateClause(idx, 'title', e.target.value)}
                              placeholder="Clause Title (e.g. Offer Terms & Position)"
                            />
                            <textarea
                              value={clause.text}
                              onChange={(e) => handleUpdateClause(idx, 'text', e.target.value)}
                              rows={isPageBreak ? 1 : 2}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '12px',
                                fontFamily: 'inherit',
                              }}
                              placeholder="Clause Content (Supports {{tokens}} e.g. You will be appointed as {{designation}}...)"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Closing Statement / Signatory Text
                    </label>
                    <textarea
                      value={customClosingText}
                      onChange={(e) => setCustomClosingText(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                      }}
                      placeholder="e.g. We welcome you to {{company_name}} and look forward to your contribution..."
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Section 3: Salary Details (Shown for Offer Letter, Appointment Letter & Salary Certificate) */}
              {(selectedDocType === 'OFFER_LETTER' || selectedDocType === 'APPOINTMENT_LETTER' || selectedDocType === 'SALARY_CERTIFICATE') && (
                <Card>
                  <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CardTitle style={{ fontSize: '15px' }}>3. Salary & Remuneration</CardTitle>
                    <Button variant="secondary" size="sm" onClick={handleUseExistingSalary} style={{ fontSize: '12px' }}>
                      Autofill Existing Salary
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
                        <Input type="number" value={annualCtc} onChange={(e) => setAnnualCtc(Number(e.target.value))} />
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
                  </CardBody>
                </Card>
              )}

              {/* Section 4: Company & HR Signatory Details */}
              <Card>
                <CardHeader><CardTitle style={{ fontSize: '15px' }}>4. Corporate Signatory & Letterhead Configuration</CardTitle></CardHeader>
                <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Name</label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Tagline</label>
                      <Input value={companyTagline} onChange={(e) => setCompanyTagline(e.target.value)} placeholder="e.g. Work Meets Human." />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company Address</label>
                    <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Corporate Email</label>
                      <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@wokhman.com" />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Corporate Phone</label>
                      <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+91 22 5555 7777" />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Website Domain</label>
                      <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="www.wokhman.com" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>CIN</label>
                      <Input value={companyCin} onChange={(e) => setCompanyCin(e.target.value)} placeholder="U74999MH2024PTC123456" />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GSTIN</label>
                      <Input value={companyGstin} onChange={(e) => setCompanyGstin(e.target.value)} placeholder="27AAACW1234F1Z5" />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>PAN</label>
                      <Input value={companyPan} onChange={(e) => setCompanyPan(e.target.value)} placeholder="AAACW1234F" />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Registered Office Address</label>
                    <Input value={registeredOffice} onChange={(e) => setRegisteredOffice(e.target.value)} placeholder="MIDC Industrial Area, Navi Mumbai, MH 400701" />
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

            {/* Right Column: Live Document Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card>
                <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle style={{ fontSize: '15px' }}>Document Preview & Toolbar</CardTitle>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                      {previewMode ? 'Edit Form' : 'Full Preview'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleGeneratePDF}
                      disabled={generating}
                      icon={<Sparkles style={{ width: '14px', height: '14px' }} />}
                    >
                      {generating ? 'Generating...' : 'Generate PDF'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveCurrentTemplate}
                      disabled={generating}
                      style={{ background: '#0F172A', color: '#FFF', borderColor: '#334155' }}
                    >
                      Save Master Template
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => window.print()} icon={<Printer style={{ width: '14px', height: '14px' }} />}>
                      Print / Export
                    </Button>
                  </div>
                </CardHeader>
                <CardBody style={{ background: '#F8FAFC', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      Target PDF File: <code>{selectedDocType.toLowerCase()}_{employeeName ? employeeName.replace(/\s+/g, '_') : 'Draft'}_{employeeCode || '001'}.pdf</code>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Zoom: {Math.round(previewScale * 100)}%</span>
                      <Button variant="secondary" size="sm" onClick={() => setPreviewScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}>Zoom -</Button>
                      <Button variant="secondary" size="sm" onClick={() => setPreviewScale(0.85)}>100%</Button>
                      <Button variant="secondary" size="sm" onClick={() => setPreviewScale((s) => Math.min(1.5, Number((s + 0.1).toFixed(2))))}>Zoom +</Button>
                      <Badge variant="success">Print-Ready A4</Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Dynamic Rendered Preview */}
              <div style={{ overflowX: 'auto', background: '#334155', padding: '24px', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
                <MultiDocumentPreview documentType={selectedDocType} data={getPreviewData()} scale={previewScale} activeLetterhead={activeLetterhead} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'history' && (
        <Card>
          <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle style={{ fontSize: '16px' }}>Unified Document History & Version Ledger</CardTitle>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value="">All Document Types</option>
                {docTypeOptions.map((opt) => (
                  <option key={opt.type} value={opt.type}>{opt.name}</option>
                ))}
              </select>

              <Input
                placeholder="Search Employee Name, ID, or Designation..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ maxWidth: '280px' }}
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
                    <Th>Document Type</Th>
                    <Th>Employee Name</Th>
                    <Th>Employee ID</Th>
                    <Th>Designation</Th>
                    <Th>Doc Date</Th>
                    <Th>Version</Th>
                    <Th>Status</Th>
                    <Th style={{ textAlign: 'right' }}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loadingHistory ? (
                    <Tr><Td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Loading document history...</Td></Tr>
                  ) : filteredHistory.length === 0 ? (
                    <Tr><Td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>No generated document history found.</Td></Tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <Tr key={item.id}>
                        <Td style={{ fontWeight: 600, color: '#3B82F6' }}>
                          {docTypeOptions.find((d) => d.type === item.documentType)?.name || item.documentType}
                        </Td>
                        <Td style={{ fontWeight: 600, color: '#0F172A' }}>{item.employeeName}</Td>
                        <Td><code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px' }}>{item.employeeCode}</code></Td>
                        <Td>{item.designation}</Td>
                        <Td>{item.documentDate}</Td>
                        <Td><Badge variant="info">v{item.versionNumber || 1}.0</Badge></Td>
                        <Td><Badge variant="success">{item.status || 'GENERATED'}</Badge></Td>
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

      {activeMainTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Company Letterhead Section */}
          <Card style={{ borderLeft: '4px solid #3B82F6' }}>
            <CardHeader>
              <CardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                Company Letterhead System & Safe Area Margins
              </CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Current Active Letterhead Banner */}
              <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: activeLetterhead ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeLetterhead ? '#16A34A' : '#DC2626' }}>
                    <FileText style={{ width: '28px', height: '28px' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '15px', color: '#0F172A' }}>
                        {activeLetterhead ? activeLetterhead.fileName : 'No Active Letterhead Configured'}
                      </strong>
                      {activeLetterhead ? (
                        <Badge variant="success">ACTIVE (v{activeLetterhead.version}.0)</Badge>
                      ) : (
                        <Badge variant="warning">NOT CONFIGURED</Badge>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                      {activeLetterhead
                        ? `Format: ${activeLetterhead.fileType.toUpperCase()} | Uploaded on: ${new Date(activeLetterhead.createdAt).toLocaleDateString()}`
                        : 'Upload an official A4 PDF or Image letterhead to apply to all company documents.'}
                    </p>
                  </div>
                </div>

                {activeLetterhead && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(activeLetterhead.fileUrl || '#', '_blank')}
                      icon={<Eye style={{ width: '14px', height: '14px' }} />}
                    >
                      View Full Letterhead
                    </Button>
                  </div>
                )}
              </div>

              {/* Upload New Letterhead Form */}
              <div style={{ padding: '20px', borderRadius: '12px', background: '#FFFFFF', border: '1.5px dashed #3B82F6' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>
                  Upload New Official Company Letterhead
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
                  Recommended format: <strong>A4 PDF (Vector graphics)</strong>. Also supports <strong>PNG, JPG, JPEG</strong> images. Uploading automatically sets the new version as active and locks previous versions.
                </p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setLetterheadFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '13px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  />
                  <Button
                    variant="primary"
                    onClick={handleUploadLetterhead}
                    disabled={!letterheadFile || uploadingLetterhead}
                    icon={<Upload style={{ width: '14px', height: '14px' }} />}
                  >
                    {uploadingLetterhead ? 'Uploading & Processing...' : 'Upload & Set Active'}
                  </Button>
                </div>
              </div>

              {/* Safe Content Area Margins Config */}
              <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>
                  Content Safe Area Margins (mm)
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
                  Adjust inner margins so document text renders cleanly inside your letterhead template without overlapping logos, headers, or footers.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Top Margin (mm)</label>
                    <Input type="number" value={margins.top} onChange={(e) => setMargins({ ...margins, top: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Bottom Margin (mm)</label>
                    <Input type="number" value={margins.bottom} onChange={(e) => setMargins({ ...margins, bottom: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Left Margin (mm)</label>
                    <Input type="number" value={margins.left} onChange={(e) => setMargins({ ...margins, left: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Right Margin (mm)</label>
                    <Input type="number" value={margins.right} onChange={(e) => setMargins({ ...margins, right: Number(e.target.value) })} />
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <Button variant="secondary" size="sm" onClick={handleUpdateMargins}>
                    Save Margin Settings
                  </Button>
                </div>
              </div>

              {/* Company Document Policy Toggles */}
              <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>
                  Company Document Policy & Governance Toggles
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={letterheadSettings.requireLetterhead}
                      onChange={(e) => setLetterheadSettings({ ...letterheadSettings, requireLetterhead: e.target.checked })}
                    />
                    <strong>Require Company Letterhead for Document Generation</strong> (Blocks HR document generation if no letterhead is active)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={letterheadSettings.allowHrReplace}
                      onChange={(e) => setLetterheadSettings({ ...letterheadSettings, allowHrReplace: e.target.checked })}
                    />
                    Allow HR / Admin managers to upload and replace active company letterhead
                  </label>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <Button variant="secondary" size="sm" onClick={handleUpdateSettings}>
                    Save Policy Settings
                  </Button>
                </div>
              </div>

              {/* Letterhead Version History Table */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0F172A', fontWeight: 700 }}>
                  Letterhead Version History Log
                </h4>

                <TableContainer>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Version</Th>
                        <Th>File Name</Th>
                        <Th>Format</Th>
                        <Th>Uploaded Date</Th>
                        <Th>Status</Th>
                        <Th style={{ textAlign: 'right' }}>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {letterheadHistory.length === 0 ? (
                        <Tr><Td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No historical letterhead versions found.</Td></Tr>
                      ) : (
                        letterheadHistory.map((lh) => (
                          <Tr key={lh.id}>
                            <Td style={{ fontWeight: 700, color: '#3B82F6' }}>v{lh.version}.0</Td>
                            <Td style={{ fontWeight: 600, color: '#0F172A' }}>{lh.fileName}</Td>
                            <Td><Badge variant="info">{lh.fileType.toUpperCase()}</Badge></Td>
                            <Td>{new Date(lh.createdAt).toLocaleDateString()}</Td>
                            <Td>{lh.isActive ? <Badge variant="success">ACTIVE</Badge> : <Badge variant="neutral">INACTIVE</Badge>}</Td>
                            <Td style={{ textAlign: 'right' }}>
                              {!lh.isActive && (
                                <Button variant="secondary" size="sm" onClick={() => handleActivateLetterhead(lh.id)}>
                                  Set Active
                                </Button>
                              )}
                            </Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MultiDocumentGeneratorStudio;
