export interface VariableContext {
  employee?: {
    name?: string;
    id?: string;
    code?: string;
    salutation?: string;
    designation?: string;
    department?: string;
    joiningDate?: string;
    acceptanceDate?: string;
    leavingDate?: string;
    relievingDate?: string;
    resignationDate?: string;
    dob?: string;
    workLocation?: string;
    reportingManager?: string;
    probationPeriod?: string;
    workingHours?: string;
    workingDays?: string;
    noticePeriod?: string;
    employmentType?: string;
    address?: string;
  };
  company?: {
    name?: string;
    tagline?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    cin?: string;
    gstin?: string;
    pan?: string;
    registeredOffice?: string;
    logoUrl?: string;
  };
  salary?: {
    monthlyGross?: string | number;
    annualCtc?: string | number;
    basicSalary?: string | number;
    hra?: string | number;
    conveyanceAllowance?: string | number;
    specialAllowance?: string | number;
    otherAllowances?: string | number;
    monthlySalary?: string | number;
  };
  document?: {
    date?: string;
    number?: string;
    title?: string;
    subject?: string;
  };
  hr?: {
    name?: string;
    designation?: string;
  };
}

function formatCurr(val: string | number | undefined): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '';
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * Server-side dynamic template variable resolver.
 * Replaces {{variable_name}} placeholders with sanitized values from context.
 * If a variable is missing, safely replaces it with an empty string.
 */
export function resolveTemplateVariables(templateContent: string, ctx: VariableContext): string {
  if (!templateContent) return '';

  const empSalutation = ctx.employee?.salutation || '';
  const empRawName = ctx.employee?.name || '';
  const fullEmpName = empSalutation ? `${empSalutation} ${empRawName}`.trim() : empRawName;

  const replacements: Record<string, string> = {
    // Employee
    '{{employee_full_name}}': fullEmpName,
    '{{employee_name}}': fullEmpName,
    '{{employee_id}}': ctx.employee?.code || ctx.employee?.id || '',
    '{{employee_code}}': ctx.employee?.code || ctx.employee?.id || '',
    '{{title}}': empSalutation,
    '{{salutation}}': empSalutation,
    '{{designation}}': ctx.employee?.designation || '',
    '{{department}}': ctx.employee?.department || '',
    '{{joining_date}}': ctx.employee?.joiningDate || '',
    '{{acceptance_date}}': ctx.employee?.acceptanceDate || '',
    '{{leaving_date}}': ctx.employee?.leavingDate || '',
    '{{relieving_date}}': ctx.employee?.relievingDate || '',
    '{{resignation_date}}': ctx.employee?.resignationDate || '',
    '{{date_of_birth}}': ctx.employee?.dob || '',
    '{{work_location}}': ctx.employee?.workLocation || '',
    '{{reporting_manager}}': ctx.employee?.reportingManager || '',
    '{{probation_period}}': ctx.employee?.probationPeriod || '',
    '{{working_hours}}': ctx.employee?.workingHours || '',
    '{{working_days}}': ctx.employee?.workingDays || '',
    '{{notice_period}}': ctx.employee?.noticePeriod || '',
    '{{employment_type}}': ctx.employee?.employmentType || '',
    '{{employee_address}}': ctx.employee?.address || '',

    // Company
    '{{company_name}}': ctx.company?.name || '',
    '{{company_tagline}}': ctx.company?.tagline || '',
    '{{company_address}}': ctx.company?.address || '',
    '{{corporate_email}}': ctx.company?.email || '',
    '{{company_email}}': ctx.company?.email || '',
    '{{corporate_phone}}': ctx.company?.phone || '',
    '{{company_phone}}': ctx.company?.phone || '',
    '{{website_domain}}': ctx.company?.website || '',
    '{{company_website}}': ctx.company?.website || '',
    '{{cin}}': ctx.company?.cin || '',
    '{{gstin}}': ctx.company?.gstin || '',
    '{{pan}}': ctx.company?.pan || '',
    '{{registered_office_address}}': ctx.company?.registeredOffice || ctx.company?.address || '',
    '{{registered_office}}': ctx.company?.registeredOffice || ctx.company?.address || '',
    '{{company_logo}}': ctx.company?.logoUrl ? `<img src="${ctx.company.logoUrl}" style="max-height: 50px;" alt="Logo" />` : '',

    // Salary
    '{{monthly_salary}}': ctx.salary?.monthlySalary !== undefined ? String(ctx.salary.monthlySalary) : (ctx.salary?.monthlyGross !== undefined ? String(ctx.salary.monthlyGross) : ''),
    '{{monthly_gross_salary}}': formatCurr(ctx.salary?.monthlyGross || ctx.salary?.monthlySalary),
    '{{monthly_gross}}': formatCurr(ctx.salary?.monthlyGross || ctx.salary?.monthlySalary),
    '{{annual_ctc}}': formatCurr(ctx.salary?.annualCtc),
    '{{basic_salary}}': formatCurr(ctx.salary?.basicSalary),
    '{{hra}}': formatCurr(ctx.salary?.hra),
    '{{conveyance}}': formatCurr(ctx.salary?.conveyanceAllowance),
    '{{special_allowance}}': formatCurr(ctx.salary?.specialAllowance),
    '{{other_allowances}}': formatCurr(ctx.salary?.otherAllowances),

    // Document
    '{{document_date}}': ctx.document?.date || new Date().toISOString().split('T')[0],
    '{{document_number}}': ctx.document?.number || '',
    '{{document_title}}': ctx.document?.title || '',
    '{{document_subject}}': ctx.document?.subject || '',

    // Signatory
    '{{authorized_person_name}}': ctx.hr?.name || '',
    '{{hr_name}}': ctx.hr?.name || '',
    '{{authorized_person_designation}}': ctx.hr?.designation || '',
    '{{hr_designation}}': ctx.hr?.designation || '',
  };

  let resolved = templateContent;
  for (const [varName, value] of Object.entries(replacements)) {
    const regex = new RegExp(varName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    resolved = resolved.replace(regex, value);
  }

  // Clean up any remaining unresolved {{...}} variables
  resolved = resolved.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');

  return resolved;
}
