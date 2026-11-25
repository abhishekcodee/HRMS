import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  Badge,
} from '../ui';
import {
  AppointmentLetterPreview,
  AppointmentLetterData,
  CustomFieldConfig,
} from './AppointmentLetterPreview';
import { TokenPickerPopover } from './TokenPickerPopover';
import {
  Printer,
  Save,
  Sliders,
  Palette,
  Layers,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Tag,
  Copy,
  AlertTriangle,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

interface AppointmentLetterBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess?: () => void;
}

export const AppointmentLetterBuilderModal: React.FC<AppointmentLetterBuilderModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [calculatingSalary, setCalculatingSalary] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'fields' | 'clauses' | 'layout' | 'salary'>('brand');
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);

  // Token picker state
  const [activeClauseIdxForToken, setActiveClauseIdxForToken] = useState<number | null>(null);

  // Companies list
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Salary Presets
  const [salaryPresets, setSalaryPresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [salaryWarnings, setSalaryWarnings] = useState<string[]>([]);

  const [letterData, setLetterData] = useState<AppointmentLetterData>({
    companyName: 'Apex Metal Fabricators Pvt. Ltd.',
    companyTagline: 'Sheet Metal Fabrication & Industrial Automation',
    companyLogo: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/building-2.svg',
    logoHeightMm: 16,
    logoAlignment: 'left',
    companyAddress: 'Plot 42, Rabale MIDC, Navi Mumbai, Maharashtra 400701',
    companyEmail: 'hr@apexmetal.in',
    companyPhone: '+91 22 2760 1234',
    companyWebsite: 'www.apexmetal.in',
    cin: 'U28112MH2015PTC261234',
    gstin: '27AABCA1234F1ZP',
    pan: 'AABCA1234F',
    companySeal: '',

    primaryBrandColor: '#1F3864',
    secondaryBrandColor: '#0F172A',
    accentColor: '#2563EB',
    fontFamily: 'Calibri, Carlito, sans-serif',
    baseFontSizePt: 10,
    headingFontSizePt: 14,

    letterTitle: 'APPOINTMENT LETTER',
    referenceNumber: 'AM/HR/APPT/2026-27/0001',
    generatedDate: new Date().toISOString().split('T')[0],

    employeeName: 'Fardin Niyaz',
    employeeCode: 'AMPL-00015',
    designation: 'Senior Automation Engineer',
    department: 'Industrial Automation',
    joiningDate: '2026-04-01',
    workLocation: 'Navi Mumbai Works',
    reportingManager: 'Rajesh Sharma (V.P. Operations)',
    employmentType: 'Full Time / Permanent',
    grade: 'M3 / Staff',

    customFields: [
      { id: '1', label: 'Employee Grade', token: '{{employee.grade}}', value: 'M3 / Staff', visible: true },
      { id: '2', label: 'Reporting Manager', token: '{{employee.reporting_manager}}', value: 'Rajesh Sharma', visible: true },
    ],
    gridColumns: 2,

    signatoryName: 'Rajesh Sharma',
    signatoryDesignation: 'Head of Human Resources',
    signatorySignature: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Huntsman_Signature.png',
    signatureMode: 'printed',

    annualCtc: 840000,
    monthlyGross: 66516,
    basicSalary: 35000,
    allowances: 31516,
    otherComponents: 3484,
    includeSalaryAnnexure: true,
    salaryBreakdownComponents: [],

    probationPeriod: '6 Months',
    noticePeriod: '30 Days',
    workingHours: '9:00 AM – 6:00 PM (Mon-Fri)',
    weeklyOff: 'Sunday',

    pageSize: 'A4',
    marginTopMm: 18,
    marginBottomMm: 16,
    marginLeftMm: 19,
    marginRightMm: 19,
    lineHeight: 1.2,
    paragraphSpacingPt: 6,
    clauseIndentMm: 6,
    headerRepeatMode: 'page_1_only',
    showFooterPageNumbers: true,
    showFooterConfidentialText: true,
    watermarkText: '',
    watermarkOpacity: 0.1,

    openingTemplate: 'We are pleased to offer you an appointment with {{company_name}} for the position of {{designation}} in the {{department}} department, effective from {{joining_date}}. We look forward to your contribution and wish you a successful and rewarding journey with our organization.',
    termsAndConditions: [
      { title: 'Employment', text: 'Your employment with {{company_name}} will be governed by company rules, regulations, and operational requirements.', enabled: true },
      { title: 'Probation', text: 'Your appointment will initially be subject to a probationary period of {{probation_period}}. Upon satisfactory completion, your employment will be confirmed in writing.', enabled: true },
      { title: 'Compensation', text: 'Your total annual compensation (CTC) will be {{salary.ctc_annual|inr}} ({{salary.ctc_annual|words}}) per annum, payable monthly in accordance with company payroll schedules.', enabled: true },
      { title: 'Working Hours', text: 'You will adhere to the official working hours of {{working_hours}} with weekly off on {{weekly_off}}.', enabled: true },
      { title: 'Leave & Holidays', text: 'You will be entitled to privilege, casual, and public leaves as per the official company Leave & Holiday Policy.', enabled: true },
      { title: 'Confidentiality', text: 'You shall maintain absolute confidentiality regarding all proprietary information, software code, client records, and business strategies.', enabled: true },
      { title: 'Intellectual Property', text: 'All products, inventions, designs, and intellectual property created during your employment belong exclusively to {{company_name}}.', enabled: true },
      { title: 'Code of Conduct', text: 'You shall uphold the highest standards of professional ethics, integrity, and compliance at all times.', enabled: true },
      { title: 'Notice Period', text: 'Either party may terminate employment by providing {{notice_period}} notice in writing or gross salary in lieu thereof.', enabled: true },
      { title: 'Termination', text: 'The company reserves the right to terminate employment immediately without notice in cases of gross misconduct or fraud.', enabled: true },
    ],
    acceptanceText: 'I have read and understood the terms and conditions of my appointment and hereby accept the appointment offered to me.',
    sectionsOrder: [
      'header',
      'letter_title',
      'employee_info_block',
      'opening_statement',
      'employment_details',
      'compensation_details',
      'terms_and_conditions',
      'acceptance_block',
      'signatory_block',
      'footer',
    ],
    sectionsVisibility: {
      header: true,
      letter_title: true,
      employee_info_block: true,
      opening_statement: true,
      employment_details: true,
      compensation_details: true,
      terms_and_conditions: true,
      acceptance_block: true,
      signatory_block: true,
      footer: true,
    },
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('hrms_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      loadInitialData();
    }
  }, [isOpen, employeeId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Load Companies & Default Company
      const compRes = await fetch('/api/v1/companies', { headers: getAuthHeaders() });
      const compJson = await compRes.json();
      if (compJson.success && compJson.data?.length > 0) {
        setCompanies(compJson.data);
        const c = compJson.data[0];
        setSelectedCompanyId(c.id);
        setLetterData((prev) => ({
          ...prev,
          companyName: c.name + (c.legalSuffix ? ` ${c.legalSuffix}` : ''),
          companyAddress: c.worksAddress || c.registeredAddress || prev.companyAddress,
          cin: c.cin || prev.cin,
          gstin: c.gstin || prev.gstin,
          pan: c.pan || prev.pan,
          companyEmail: c.email || prev.companyEmail,
          companyPhone: c.phone || prev.companyPhone,
          companyWebsite: c.website || prev.companyWebsite,
          companyLogo: c.logoPath || prev.companyLogo,
          signatorySignature: c.signaturePath || prev.signatorySignature,
        }));
      }

      // 2. Load Employee Details
      const empRes = await fetch(`/api/v1/employees/${employeeId}`, { headers: getAuthHeaders() });
      const empJson = await empRes.json();

      if (empJson.success && empJson.data) {
        const emp = empJson.data;
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Sample Employee';
        setLetterData((prev) => ({
          ...prev,
          employeeName: fullName,
          employeeCode: emp.employee_id || emp.code || 'EMP-00125',
          designation: emp.designation || emp.job_title || 'Software Developer',
          department: emp.department || 'Technology',
          joiningDate: emp.date_of_joining || emp.joining_date || new Date().toISOString().split('T')[0],
          workLocation: emp.location || emp.branch || 'Navi Mumbai Works',
          annualCtc: parseFloat(emp.gross_salary || emp.annual_ctc || 840000),
        }));

        // Calculate initial salary annexure
        await calculateAnnexure(parseFloat(emp.gross_salary || emp.annual_ctc || 840000));
      }

      // 3. Load Salary Presets
      const presetRes = await fetch('/api/v1/salary-presets', { headers: getAuthHeaders() });
      const presetJson = await presetRes.json();
      if (presetJson.success && presetJson.data) {
        setSalaryPresets(presetJson.data);
      }
    } catch (err) {
      console.error('Failed to load builder initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnnexure = async (annualCtcVal: number, presetId?: string) => {
    setCalculatingSalary(true);
    try {
      const res = await fetch('/api/v1/salary-presets/calculate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          annual_ctc: annualCtcVal,
          preset_id: presetId || selectedPresetId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setLetterData((prev) => ({
          ...prev,
          annualCtc: d.ctcAnnual,
          monthlyGross: d.grossMonthly,
          basicSalary: d.components.find((c: any) => c.name === 'Basic Salary')?.monthly || Math.round(d.grossMonthly * 0.5),
          allowances: d.grossMonthly - Math.round(d.grossMonthly * 0.5),
          otherComponents: d.retiralsMonthly,
          salaryBreakdownComponents: d.components,
        }));
        setSalaryWarnings(d.warnings || []);
      }
    } catch (err) {
      console.error('Failed to calculate salary annexure:', err);
    } finally {
      setCalculatingSalary(false);
    }
  };

  // Clause Editing Handlers
  const handleClauseChange = (index: number, field: 'title' | 'text', value: string) => {
    const updated = [...(letterData.termsAndConditions || [])];
    updated[index] = { ...updated[index], [field]: value };
    setLetterData({ ...letterData, termsAndConditions: updated });
  };

  const handleToggleClauseEnabled = (index: number) => {
    const updated = [...(letterData.termsAndConditions || [])];
    updated[index] = { ...updated[index], enabled: updated[index].enabled === false ? true : false };
    setLetterData({ ...letterData, termsAndConditions: updated });
  };

  const handleAddClause = () => {
    setLetterData({
      ...letterData,
      termsAndConditions: [
        ...(letterData.termsAndConditions || []),
        { title: 'New Clause', text: 'Enter clause terms here...', enabled: true },
      ],
    });
  };

  const handleDuplicateClause = (index: number) => {
    const terms = letterData.termsAndConditions || [];
    const target = terms[index];
    const updated = [...terms];
    updated.splice(index + 1, 0, { ...target, title: `${target.title} (Copy)` });
    setLetterData({ ...letterData, termsAndConditions: updated });
  };

  const handleDeleteClause = (index: number) => {
    if (confirm('Are you sure you want to delete this clause?')) {
      const updated = (letterData.termsAndConditions || []).filter((_: any, i: number) => i !== index);
      setLetterData({ ...letterData, termsAndConditions: updated });
    }
  };

  const handleMoveClause = (index: number, direction: 'up' | 'down') => {
    const list = [...(letterData.termsAndConditions || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setLetterData({ ...letterData, termsAndConditions: list });
  };

  const handleInsertTokenInClause = (tokenStr: string) => {
    if (activeClauseIdxForToken !== null) {
      const terms = letterData.termsAndConditions || [];
      const target = terms[activeClauseIdxForToken];
      if (target) {
        handleClauseChange(activeClauseIdxForToken, 'text', (target.text || '') + ' ' + tokenStr);
      }
      setActiveClauseIdxForToken(null);
    }
  };

  const handleAddCustomField = () => {
    const newField: CustomFieldConfig = {
      id: `custom_${Date.now()}`,
      label: 'New Dynamic Field',
      value: '',
      type: 'text',
      enabled: true,
      visible: true,
    };
    setLetterData({
      ...letterData,
      customFields: [...(letterData.customFields || []), newField],
    });
  };

  const handleUpdateCustomField = (id: string, updates: Partial<CustomFieldConfig>) => {
    const updated = (letterData.customFields || []).map((f: any) => (f.id === id ? { ...f, ...updates } : f));
    setLetterData({ ...letterData, customFields: updated });
  };

  const handleDeleteCustomField = (id: string) => {
    const updated = (letterData.customFields || []).filter((f: any) => f.id !== id);
    setLetterData({ ...letterData, customFields: updated });
  };

  // Print & Generate Handlers
  const handlePrint = () => {
    const previewEl = document.querySelector('.appointment-letter-a4-page');
    if (!previewEl) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=1000');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Letter - ${letterData.employeeName}</title>
          <style>
            @page {
              size: ${letterData.pageSize === 'US_Letter' ? 'letter' : 'A4'};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: ${letterData.fontFamily};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .appointment-letter-a4-page {
              width: 100% !important;
              min-height: auto !important;
              box-shadow: none !important;
              transform: none !important;
              margin: 0 !important;
              box-sizing: border-box !important;
            }
            .page-break-before-always { page-break-before: always !important; }
            .page-break-inside-avoid { page-break-inside: avoid !important; }
          </style>
        </head>
        <body>
          ${previewEl.outerHTML}
          <script>
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleSaveAndGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/appointment-letters/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: selectedCompanyId,
          annual_ctc: letterData.annualCtc,
          letter_data: letterData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Appointment letter generated and saved to employee profile successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('Error generating appointment letter: ' + (json.error?.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error generating letter: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Corporate Appointment Letter Builder & Live Preview"
      maxWidth="1550px"
    >
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading builder and employee metadata...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 160px)' }}>
          {/* Top Control Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-card)',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <select
                className="select"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  const c = companies.find((comp) => comp.id === e.target.value);
                  if (c) {
                    setLetterData((prev) => ({
                      ...prev,
                      companyName: c.name + (c.legalSuffix ? ` ${c.legalSuffix}` : ''),
                      companyAddress: c.worksAddress || c.registeredAddress || prev.companyAddress,
                      cin: c.cin || prev.cin,
                      gstin: c.gstin || prev.gstin,
                      pan: c.pan || prev.pan,
                    }));
                  }
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name} ({c.code})
                  </option>
                ))}
              </select>

              <Badge variant="info">Employee: {letterData.employeeName} ({letterData.employeeCode})</Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Zoom:</span>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.05))}
                >
                  -
                </button>
                <strong>{Math.round(zoomLevel * 100)}%</strong>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.05))}
                >
                  +
                </button>
              </div>

              <Button variant="outline" size="sm" icon={<Printer size={16} />} onClick={handlePrint}>
                Print / Save PDF
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 size={16} />}
                onClick={handleSaveAndGenerate}
                isLoading={generating}
              >
                Generate & Save to Profile
              </Button>
            </div>
          </div>

          {/* Main 2-Column Studio Viewport */}
          <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: '1.25rem', flex: 1, overflow: 'hidden' }}>
            {/* Left Control Sidebar */}
            <Card style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <CardHeader style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                  <button
                    className={`btn btn-xs ${activeTab === 'brand' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('brand')}
                  >
                    <Palette size={13} /> Brand
                  </button>
                  <button
                    className={`btn btn-xs ${activeTab === 'fields' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('fields')}
                  >
                    <Sliders size={13} /> Grid
                  </button>
                  <button
                    className={`btn btn-xs ${activeTab === 'clauses' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('clauses')}
                  >
                    <FileText size={13} /> Clauses ({(letterData.termsAndConditions || []).length})
                  </button>
                  <button
                    className={`btn btn-xs ${activeTab === 'layout' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('layout')}
                  >
                    <Layers size={13} /> Layout
                  </button>
                  <button
                    className={`btn btn-xs ${activeTab === 'salary' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('salary')}
                  >
                    <DollarSign size={13} /> Salary
                  </button>
                </div>
              </CardHeader>

              <CardBody style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
                {/* 1. BRAND TAB */}
                {activeTab === 'brand' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input
                      label="Letterhead Title"
                      value={letterData.letterTitle}
                      onChange={(e) => setLetterData({ ...letterData, letterTitle: e.target.value })}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Input
                        label="Primary Accent Color"
                        type="color"
                        value={letterData.primaryBrandColor}
                        onChange={(e) => setLetterData({ ...letterData, primaryBrandColor: e.target.value })}
                      />
                      <Input
                        label="Accent Color"
                        type="color"
                        value={letterData.accentColor}
                        onChange={(e) => setLetterData({ ...letterData, accentColor: e.target.value })}
                      />
                    </div>

                    <Input
                      label="Logo Image URL"
                      value={letterData.companyLogo || ''}
                      onChange={(e) => setLetterData({ ...letterData, companyLogo: e.target.value })}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Input
                        label="Logo Height (mm)"
                        type="number"
                        value={letterData.logoHeightMm || 16}
                        onChange={(e) => setLetterData({ ...letterData, logoHeightMm: parseInt(e.target.value) || 16 })}
                      />
                      <div>
                        <label className="form-label">Logo Alignment</label>
                        <select
                          className="select"
                          value={letterData.logoAlignment || 'left'}
                          onChange={(e) => setLetterData({ ...letterData, logoAlignment: e.target.value as any })}
                        >
                          <option value="left">Left Aligned</option>
                          <option value="center">Center Aligned</option>
                          <option value="right">Right Aligned</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Signature Mode on PDF</label>
                      <select
                        className="select"
                        value={letterData.signatureMode || 'printed'}
                        onChange={(e) => setLetterData({ ...letterData, signatureMode: e.target.value as any })}
                      >
                        <option value="printed">Print Signature Image on PDF</option>
                        <option value="wet_sign">Leave Blank Space for Wet Sign</option>
                      </select>
                    </div>

                    <Input
                      label="Signature Image URL"
                      value={letterData.signatorySignature || ''}
                      onChange={(e) => setLetterData({ ...letterData, signatorySignature: e.target.value })}
                    />

                    <Input
                      label="Company Tagline"
                      value={letterData.companyTagline || ''}
                      onChange={(e) => setLetterData({ ...letterData, companyTagline: e.target.value })}
                    />

                    <Input
                      label="Company Works / Registered Address"
                      value={letterData.companyAddress || ''}
                      onChange={(e) => setLetterData({ ...letterData, companyAddress: e.target.value })}
                    />
                  </div>
                )}

                {/* 2. FIELDS TAB */}
                {activeTab === 'fields' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Detail Grid Layout & Custom Fields</strong>
                      <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={handleAddCustomField}>
                        + Field
                      </Button>
                    </div>

                    <div>
                      <label className="form-label">Grid Layout Columns</label>
                      <select
                        className="select"
                        value={letterData.gridColumns || 2}
                        onChange={(e) => setLetterData({ ...letterData, gridColumns: parseInt(e.target.value) as any })}
                      >
                        <option value={1}>1 Column List</option>
                        <option value={2}>2 Column Grid (Standard)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(letterData.customFields || []).map((field: any) => (
                        <div
                          key={field.id}
                          style={{
                            padding: '0.6rem',
                            backgroundColor: 'var(--bg-app)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="input"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', fontWeight: 700 }}
                              value={field.label}
                              onChange={(e) => handleUpdateCustomField(field.id, { label: e.target.value })}
                            />
                            <button
                              onClick={() => handleDeleteCustomField(field.id)}
                              style={{ color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <input
                            type="text"
                            className="input"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                            value={field.value || field.token || ''}
                            onChange={(e) => handleUpdateCustomField(field.id, { value: e.target.value })}
                            placeholder="Data token or static value"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. CLAUSES TAB */}
                {activeTab === 'clauses' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Terms & Conditions Clauses</strong>
                      <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAddClause}>
                        Add Clause
                      </Button>
                    </div>

                    {/* Token Picker Overlay if active */}
                    {activeClauseIdxForToken !== null && (
                      <TokenPickerPopover
                        onSelectToken={handleInsertTokenInClause}
                        onClose={() => setActiveClauseIdxForToken(null)}
                      />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(letterData.termsAndConditions || []).map((clause: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: clause.enabled === false ? 'rgba(255,255,255,0.02)' : 'var(--bg-app)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Badge variant="info" style={{ fontFamily: 'monospace' }}>
                                {String(idx + 1).padStart(2, '0')}
                              </Badge>
                              <input
                                type="checkbox"
                                checked={clause.enabled !== false}
                                onChange={() => handleToggleClauseEnabled(idx)}
                                title="Toggle Clause Enabled/Disabled"
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => setActiveClauseIdxForToken(idx)}
                                title="Insert Data Token"
                              >
                                <Tag size={12} /> Token
                              </button>
                              <button className="btn btn-xs btn-ghost" onClick={() => handleDuplicateClause(idx)} title="Duplicate">
                                <Copy size={12} />
                              </button>
                              <button className="btn btn-xs btn-ghost" onClick={() => handleMoveClause(idx, 'up')} disabled={idx === 0}>
                                <ArrowUp size={12} />
                              </button>
                              <button
                                className="btn btn-xs btn-ghost"
                                onClick={() => handleMoveClause(idx, 'down')}
                                disabled={idx === (letterData.termsAndConditions || []).length - 1}
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button className="btn btn-xs btn-ghost" onClick={() => handleDeleteClause(idx)} style={{ color: 'var(--danger-text)' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            className="input"
                            style={{ fontWeight: 700, fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            value={clause.title}
                            onChange={(e) => handleClauseChange(idx, 'title', e.target.value)}
                          />

                          <textarea
                            className="textarea"
                            rows={3}
                            style={{ fontSize: '0.775rem', padding: '0.4rem 0.5rem' }}
                            value={clause.text}
                            onChange={(e) => handleClauseChange(idx, 'text', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. LAYOUT TAB */}
                {activeTab === 'layout' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Page Paper Size</label>
                      <select
                        className="select"
                        value={letterData.pageSize || 'A4'}
                        onChange={(e) => setLetterData({ ...letterData, pageSize: e.target.value as any })}
                      >
                        <option value="A4">A4 (210mm x 297mm)</option>
                        <option value="US_Letter">US Letter (216mm x 279mm)</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Input
                        label="Top Margin (mm)"
                        type="number"
                        value={letterData.marginTopMm || 18}
                        onChange={(e) => setLetterData({ ...letterData, marginTopMm: parseInt(e.target.value) || 18 })}
                      />
                      <Input
                        label="Bottom Margin (mm)"
                        type="number"
                        value={letterData.marginBottomMm || 16}
                        onChange={(e) => setLetterData({ ...letterData, marginBottomMm: parseInt(e.target.value) || 16 })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Input
                        label="Left Margin (mm)"
                        type="number"
                        value={letterData.marginLeftMm || 19}
                        onChange={(e) => setLetterData({ ...letterData, marginLeftMm: parseInt(e.target.value) || 19 })}
                      />
                      <Input
                        label="Right Margin (mm)"
                        type="number"
                        value={letterData.marginRightMm || 19}
                        onChange={(e) => setLetterData({ ...letterData, marginRightMm: parseInt(e.target.value) || 19 })}
                      />
                    </div>

                    <Input
                      label="Watermark Overlay Text"
                      value={letterData.watermarkText || ''}
                      onChange={(e) => setLetterData({ ...letterData, watermarkText: e.target.value })}
                      placeholder="e.g. CONFIDENTIAL / DRAFT"
                    />

                    <div>
                      <label className="form-label">Watermark Opacity ({Math.round((letterData.watermarkOpacity || 0.1) * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={letterData.watermarkOpacity || 0.1}
                        onChange={(e) => setLetterData({ ...letterData, watermarkOpacity: parseFloat(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}

                {/* 5. SALARY TAB */}
                {activeTab === 'salary' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Salary Annexure & Presets</strong>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem' }}>
                        <input
                          type="checkbox"
                          checked={letterData.includeSalaryAnnexure !== false}
                          onChange={(e) => setLetterData({ ...letterData, includeSalaryAnnexure: e.target.checked })}
                        />
                        Include Annexure A
                      </label>
                    </div>

                    <Input
                      label="Annual Cost to Company (CTC in ₹)"
                      type="number"
                      value={letterData.annualCtc}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setLetterData({ ...letterData, annualCtc: val });
                        calculateAnnexure(val);
                      }}
                    />

                    <div>
                      <label className="form-label">Structure Preset</label>
                      <select
                        className="select"
                        value={selectedPresetId}
                        onChange={(e) => {
                          setSelectedPresetId(e.target.value);
                          calculateAnnexure(letterData.annualCtc || 0, e.target.value);
                        }}
                      >
                        <option value="">Standard Manufacturing Ratio (50% Basic, 25% HRA, PF/ESIC)</option>
                        {salaryPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {salaryWarnings.length > 0 && (
                      <div
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid var(--warning-border)',
                          borderRadius: '6px',
                          padding: '0.65rem',
                          fontSize: '0.75rem',
                          color: 'var(--warning-text)',
                        }}
                      >
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <AlertTriangle size={14} /> Validation Warnings:
                        </strong>
                        {salaryWarnings.map((w, i) => (
                          <div key={i}>• {w}</div>
                        ))}
                      </div>
                    )}

                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.775rem' }}>
                      <div>Gross Monthly: <strong>₹{(letterData.monthlyGross || 0).toLocaleString('en-IN')}</strong></div>
                      <div>Basic Salary: <strong>₹{(letterData.basicSalary || 0).toLocaleString('en-IN')}</strong></div>
                      <div>Retirals / Employer PF: <strong>₹{(letterData.otherComponents || 0).toLocaleString('en-IN')}</strong></div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Right Live Preview Canvas Viewport */}
            <div
              style={{
                backgroundColor: '#0F172A',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                padding: '2rem 1.5rem',
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <AppointmentLetterPreview data={letterData} scale={zoomLevel} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AppointmentLetterBuilderModal;
