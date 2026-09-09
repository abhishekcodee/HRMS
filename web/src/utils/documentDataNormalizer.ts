export interface NormalizedDocumentData {
  // Employee
  salutation: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  joiningDate: string;
  acceptanceDate: string;
  leavingDate: string;
  relievingDate: string;
  resignationDate: string;
  workLocation: string;
  reportingManager: string;
  reportingTime: string;
  probationPeriod: string;
  workingHours: string;
  workingDays: string;
  noticePeriod: string;
  employmentType: string;
  employeeAddress: string;

  // Salary
  monthlyGross: number;
  annualCtc: number;
  basicSalary: number;
  hra: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  includeSalaryAnnexure: boolean;

  // Company
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyCin: string;
  companyGstin: string;
  companyPan: string;
  registeredOffice: string;
  companyLogo: string;

  // Signatory
  hrName: string;
  hrDesignation: string;

  // Document
  documentDate: string;
  letterTitle: string;
  customSubject: string;
  customOpeningText: string;
  customClauses: Array<{ id?: string; title: string; text: string; enabled?: boolean }>;
  customClosingText: string;

  // Document Specific Extras
  reasonForLeaving?: string;
  conductRating?: string;
  experiencePeriod?: string;
  mainTasks?: string;
  purposeText?: string;
  warningSubject?: string;
  issueDescription?: string;
  responseDeadlineHours?: number;

  // Payslip Specific Extras
  payMonthYear?: string;
  workedDays?: number | string;
  uanNo?: string;
  prevBalLeaves?: number | string;
  enjoyedLeaves?: number | string;
  balanceLeaves?: number | string;
  balanceWoff?: number | string;
  lta?: number;
  arrears?: number;
  otherAllowance?: number;
  providentFund?: number;
  esic?: number;
  mlwf?: number;
  professionalTax?: number;
  advanceLoan?: number;
  tds?: number;
  paymentMode?: string;
  bankAccountNo?: string;
  bankName?: string;
  dateOfBirth?: string;
}

export function formatIndianCurrency(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function buildNormalizedVariableMap(data: Partial<NormalizedDocumentData>): Record<string, string> {
  const salutation = data.salutation || '';
  const empName = data.employeeName || '';
  const titlePrefix = salutation ? `${salutation} ` : '';
  const fullEmpName = `${titlePrefix}${empName}`.trim();

  return {
    // Employee
    '{{employee_full_name}}': fullEmpName,
    '{{employee_name}}': fullEmpName,
    '{{employee_id}}': data.employeeCode || '',
    '{{employee_code}}': data.employeeCode || '',
    '{{title}}': salutation,
    '{{salutation}}': salutation,
    '{{designation}}': data.designation || '',
    '{{department}}': data.department || '',
    '{{joining_date}}': data.joiningDate || '',
    '{{acceptance_date}}': data.acceptanceDate || '',
    '{{leaving_date}}': data.leavingDate || '',
    '{{relieving_date}}': data.relievingDate || '',
    '{{resignation_date}}': data.resignationDate || '',
    '{{employee_address}}': data.employeeAddress || '',

    // Salary
    '{{monthly_gross_salary}}': formatIndianCurrency(data.monthlyGross),
    '{{monthly_gross}}': formatIndianCurrency(data.monthlyGross),
    '{{annual_ctc}}': formatIndianCurrency(data.annualCtc),
    '{{basic_salary}}': formatIndianCurrency(data.basicSalary),
    '{{hra}}': formatIndianCurrency(data.hra),
    '{{conveyance}}': formatIndianCurrency(data.conveyanceAllowance),
    '{{conveyance_allowance}}': formatIndianCurrency(data.conveyanceAllowance),
    '{{special_allowance}}': formatIndianCurrency(data.specialAllowance),
    '{{other_allowances}}': formatIndianCurrency(data.otherAllowances),

    // Company
    '{{company_name}}': data.companyName || '',
    '{{company_tagline}}': data.companyTagline || '',
    '{{company_address}}': data.companyAddress || '',
    '{{corporate_email}}': data.companyEmail || '',
    '{{company_email}}': data.companyEmail || '',
    '{{corporate_phone}}': data.companyPhone || '',
    '{{company_phone}}': data.companyPhone || '',
    '{{website_domain}}': data.companyWebsite || '',
    '{{company_website}}': data.companyWebsite || '',
    '{{cin}}': data.companyCin || '',
    '{{gstin}}': data.companyGstin || '',
    '{{pan}}': data.companyPan || '',
    '{{registered_office_address}}': data.registeredOffice || '',
    '{{registered_office}}': data.registeredOffice || '',

    // Signatory
    '{{authorized_person_name}}': data.hrName || '',
    '{{hr_name}}': data.hrName || '',
    '{{authorized_person_designation}}': data.hrDesignation || '',
    '{{hr_designation}}': data.hrDesignation || '',

    // Other
    '{{document_date}}': data.documentDate || '',
    '{{probation_period}}': data.probationPeriod || '',
    '{{employment_type}}': data.employmentType || '',
    '{{work_location}}': data.workLocation || '',
    '{{working_hours}}': data.workingHours || '',
    '{{working_days}}': data.workingDays || '',
    '{{notice_period}}': data.noticePeriod || '',
    '{{reporting_manager}}': data.reportingManager || '',
  };
}

export function interpolateTemplateString(templateStr: string, variableMap: Record<string, string>): string {
  if (!templateStr) return '';
  let result = templateStr;
  for (const [key, value] of Object.entries(variableMap)) {
    if (result.includes(key)) {
      result = result.replaceAll(key, value || '');
    }
  }
  // Replace any lingering unresolved {{...}} with empty string to avoid broken placeholders
  result = result.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');
  return result;
}
