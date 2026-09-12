import { pool } from '../../database/index.js';

export interface CalculationBreakdown {
  employeeInfo: {
    id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    state: string;
  };
  attendanceSummary: {
    calendarDays: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    paidLeaveDays: number;
    lopDays: number;
    payableDays: number;
    overtimeHours: number;
    lateMinutes: number;
  };
  formulas: {
    payableDaysFormula: string;
    lopDeductionFormula: string;
    pfFormula: string;
    esicFormula: string;
    ptFormula: string;
    tdsFormula: string;
    otFormula: string;
  };
  earnedComponents: Record<string, number>;
  deductionComponents: Record<string, number>;
  statutoryDetails: {
    pfWage: number;
    employeePf: number;
    employerEps: number;
    employerEpf: number;
    totalEmployerPf: number;
    esicWage: number;
    employeeEsic: number;
    employerEsic: number;
    ptState: string;
    ptGrossConsidered: number;
    ptAmount: number;
    annualTaxableIncome: number;
    annualEstimatedTax: number;
    monthlyTds: number;
  };
  otDetails: {
    approvedHours: number;
    hourlyRate: number;
    multiplier: number;
    totalOtPay: number;
  };
  summary: {
    grossEarnings: number;
    totalDeductions: number;
    netSalary: number;
    employerCost: number;
  };
}

export async function calculateEmployeeMonthlyPayroll(
  employeeId: string,
  month: number,
  year: number,
  payableDaysPolicy: string = 'CALENDAR_DAYS'
) {
  // 1. Fetch Employee Profile & User Data
  const [empRows]: any = await pool.query(
    `SELECT ep.*, u.full_name as fullName, u.employee_id as employeeCode, u.email
     FROM employee_profiles ep
     JOIN users u ON u.id = ep.user_id
     WHERE ep.user_id = ? OR ep.id = ?`,
    [employeeId, employeeId]
  );

  if (!empRows || empRows.length === 0) {
    throw new Error(`Employee profile not found for ID ${employeeId}`);
  }
  const emp = empRows[0];

  // Days in month
  const calendarDays = new Date(year, month, 0).getDate();
  const workingDays = calendarDays - 4; // Assuming 4 Sundays/Weekly Offs default

  // 2. Fetch Approved Attendance & Leave Data for the Month
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(calendarDays).padStart(2, '0')}`;

  const [attRows]: any = await pool.query(
    `SELECT status, overtime_hours, late_minutes 
     FROM attendance 
     WHERE user_id = ? AND work_date >= ? AND work_date <= ?`,
    [emp.user_id, startDateStr, endDateStr]
  );

  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let lopDays = 0;
  let totalOtHours = 0;
  let totalLateMinutes = 0;

  for (const att of attRows) {
    const st = att.status?.toUpperCase();
    if (st === 'PRESENT' || st === 'LATE' || st === 'EARLY_LEAVING' || st === 'ON_DUTY' || st === 'WORK_FROM_HOME') {
      presentDays += 1;
    } else if (st === 'HALF_DAY') {
      presentDays += 0.5;
      lopDays += 0.5;
    } else if (st === 'ABSENT' || st === 'UNPAID_LEAVE') {
      absentDays += 1;
      lopDays += 1;
    } else if (st === 'PAID_LEAVE' || st === 'COMP_OFF') {
      paidLeaveDays += 1;
    }

    if (att.overtime_hours) totalOtHours += Number(att.overtime_hours);
    if (att.late_minutes) totalLateMinutes += Number(att.late_minutes);
  }

  // Determine Payable Days
  let totalPeriodDays = calendarDays;
  if (payableDaysPolicy === 'FIXED_30') totalPeriodDays = 30;
  else if (payableDaysPolicy === 'WORKING_DAYS') totalPeriodDays = workingDays;

  const payableDays = Math.max(0, totalPeriodDays - lopDays);

  // 3. Fetch Assigned Salary Structure / CTC
  let baseMonthlyGross = Number(emp.salary) || 50000;
  let baseBasic = baseMonthlyGross * 0.40;
  let baseHra = baseBasic * 0.50;
  let baseConveyance = 1600;
  let baseMedical = 1250;
  let baseSpecial = Math.max(0, baseMonthlyGross - baseBasic - baseHra - baseConveyance - baseMedical);

  // Check if explicit employee_salary_structures row exists
  const [structRows]: any = await pool.query(
    `SELECT * FROM employee_salary_structures WHERE employee_id = ? AND is_active = 1 LIMIT 1`,
    [emp.user_id]
  );

  if (structRows && structRows.length > 0) {
    baseMonthlyGross = Number(structRows[0].monthly_gross) || baseMonthlyGross;
    if (structRows[0].structure_snapshot_json) {
      try {
        const snap = JSON.parse(structRows[0].structure_snapshot_json);
        if (snap.basic) baseBasic = Number(snap.basic);
        if (snap.hra) baseHra = Number(snap.hra);
        if (snap.conveyance) baseConveyance = Number(snap.conveyance);
        if (snap.medical) baseMedical = Number(snap.medical);
        if (snap.specialAllowance) baseSpecial = Number(snap.specialAllowance);
      } catch (e) {}
    }
  }

  // 4. Calculate Prorated Salary & LOP Deduction
  const prorationRatio = payableDays / totalPeriodDays;
  const earnedBasic = Math.round(baseBasic * prorationRatio);
  const earnedHra = Math.round(baseHra * prorationRatio);
  const earnedConveyance = Math.round(baseConveyance * prorationRatio);
  const earnedMedical = Math.round(baseMedical * prorationRatio);
  const earnedSpecial = Math.round(baseSpecial * prorationRatio);

  const unproratedGross = baseBasic + baseHra + baseConveyance + baseMedical + baseSpecial;
  const earnedBaseGross = earnedBasic + earnedHra + earnedConveyance + earnedMedical + earnedSpecial;
  const lopDeductionAmount = Math.max(0, unproratedGross - earnedBaseGross);

  // 5. Overtime Calculation
  const [otConfigs]: any = await pool.query(`SELECT * FROM overtime_policies WHERE is_active = 1 LIMIT 1`);
  let otMultiplier = 1.5;
  if (otConfigs && otConfigs.length > 0) {
    otMultiplier = Number(otConfigs[0].multiplier) || 1.5;
  }
  const hourlyRate = baseBasic / (totalPeriodDays * 8);
  const overtimePay = Math.round(totalOtHours * hourlyRate * otMultiplier);

  const bonusIncentive = 0; // Configurable per run
  const grossEarnings = earnedBaseGross + overtimePay + bonusIncentive;

  // 6. Statutory Calculations (PF, ESIC, PT, TDS)
  // EPF
  const [pfConfigs]: any = await pool.query(`SELECT * FROM statutory_pf_configs WHERE is_active = 1 LIMIT 1`);
  let employeePf = 0;
  let employerEps = 0;
  let employerEpf = 0;
  let totalEmployerPf = 0;
  let pfWage = 0;

  if (!pfConfigs || pfConfigs.length === 0 || pfConfigs[0].enabled) {
    const pfRate = pfConfigs && pfConfigs[0] ? Number(pfConfigs[0].employee_rate) / 100 : 0.12;
    const epsRate = pfConfigs && pfConfigs[0] ? Number(pfConfigs[0].eps_rate) / 100 : 0.0833;
    const epfEmployerRate = pfConfigs && pfConfigs[0] ? Number(pfConfigs[0].epf_employer_rate) / 100 : 0.0367;
    const ceiling = pfConfigs && pfConfigs[0] ? Number(pfConfigs[0].wage_ceiling) : 15000;

    const rawPfWage = earnedBasic;
    pfWage = (pfConfigs && pfConfigs[0] && pfConfigs[0].restrict_to_ceiling) ? Math.min(rawPfWage, ceiling) : rawPfWage;

    employeePf = Math.round(pfWage * pfRate);
    employerEps = Math.round(pfWage * epsRate);
    employerEpf = Math.round(pfWage * epfEmployerRate);
    totalEmployerPf = employerEps + employerEpf;
  }

  // ESIC
  const [esicConfigs]: any = await pool.query(`SELECT * FROM statutory_esic_configs WHERE is_active = 1 LIMIT 1`);
  let employeeEsic = 0;
  let employerEsic = 0;
  let esicWage = 0;

  if (esicConfigs && esicConfigs.length > 0 && esicConfigs[0].enabled) {
    const threshold = Number(esicConfigs[0].eligibility_threshold) || 21000;
    if (grossEarnings <= threshold) {
      esicWage = grossEarnings;
      employeeEsic = Math.ceil(esicWage * (Number(esicConfigs[0].employee_rate) / 100));
      employerEsic = Math.ceil(esicWage * (Number(esicConfigs[0].employer_rate) / 100));
    }
  }

  // Professional Tax (PT)
  const empState = emp.residential_state || emp.permanent_state || 'Maharashtra';
  const [ptRows]: any = await pool.query(
    `SELECT * FROM professional_tax_slabs 
     WHERE state = ? AND min_gross <= ? AND max_gross >= ? AND is_active = 1 LIMIT 1`,
    [empState, grossEarnings, grossEarnings]
  );

  let professionalTax = 0;
  if (ptRows && ptRows.length > 0) {
    professionalTax = month === 2 && ptRows[0].february_tax ? Number(ptRows[0].february_tax) : Number(ptRows[0].monthly_tax);
  } else if (grossEarnings > 10000) {
    professionalTax = 200; // Default fallback for standard gross
  }

  // TDS / Income Tax Estimation
  const annualGross = grossEarnings * 12;
  const standardDeduction = 75000;
  const annualTaxableIncome = Math.max(0, annualGross - standardDeduction);

  let annualEstimatedTax = 0;
  if (annualTaxableIncome > 1200000) {
    annualEstimatedTax = (annualTaxableIncome - 1200000) * 0.20 + 90000;
  } else if (annualTaxableIncome > 800000) {
    annualEstimatedTax = (annualTaxableIncome - 800000) * 0.15 + 30000;
  } else if (annualTaxableIncome > 400000) {
    annualEstimatedTax = (annualTaxableIncome - 400000) * 0.10;
  }
  // 4% Health & Education Cess
  if (annualEstimatedTax > 0) {
    annualEstimatedTax = Math.round(annualEstimatedTax * 1.04);
  }
  const monthlyTds = Math.round(annualEstimatedTax / 12);

  // 7. Loans & Advances EMI Deductions
  const [loanRows]: any = await pool.query(
    `SELECT SUM(monthly_emi) as totalEmi 
     FROM employee_loans_advancements 
     WHERE employee_id = ? AND status = 'ACTIVE'`,
    [emp.user_id]
  );
  const loanEmiDeduction = Number(loanRows[0]?.totalEmi) || 0;

  const otherDeductions = 0;
  const totalDeductions = employeePf + employeeEsic + professionalTax + monthlyTds + loanEmiDeduction + otherDeductions;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  const gratuityProvision = Math.round((earnedBasic * 15) / 26 / 12);
  const totalEmployerCost = grossEarnings + totalEmployerPf + employerEsic + gratuityProvision;

  // 8. Construct Auditable Calculation Breakdown
  const breakdown: CalculationBreakdown = {
    employeeInfo: {
      id: emp.user_id,
      employeeCode: emp.employeeCode || 'EMP-001',
      fullName: emp.fullName || 'Employee',
      department: emp.department_name || 'General',
      designation: emp.designation || 'Staff',
      state: empState,
    },
    attendanceSummary: {
      calendarDays,
      workingDays,
      presentDays,
      absentDays,
      paidLeaveDays,
      lopDays,
      payableDays,
      overtimeHours: totalOtHours,
      lateMinutes: totalLateMinutes,
    },
    formulas: {
      payableDaysFormula: `Payable Days = Total Days (${totalPeriodDays}) - LOP Days (${lopDays}) = ${payableDays}`,
      lopDeductionFormula: `LOP Deduction = Base Gross (₹${unproratedGross.toLocaleString()}) - Earned Gross (₹${earnedBaseGross.toLocaleString()}) = ₹${lopDeductionAmount.toLocaleString()}`,
      pfFormula: `PF Wage = min(Earned Basic ₹${earnedBasic.toLocaleString()}, ₹15,000) = ₹${pfWage.toLocaleString()} × 12% = ₹${employeePf.toLocaleString()}`,
      esicFormula: `ESIC Wage = Gross (₹${grossEarnings.toLocaleString()}) × 0.75% = ₹${employeeEsic.toLocaleString()}`,
      ptFormula: `State (${empState}) PT Slab for Gross ₹${grossEarnings.toLocaleString()} = ₹${professionalTax.toLocaleString()}`,
      tdsFormula: `Annual Gross (₹${annualGross.toLocaleString()}) - Std Ded (₹75k) = Taxable ₹${annualTaxableIncome.toLocaleString()} -> Est. Monthly TDS ₹${monthlyTds.toLocaleString()}`,
      otFormula: `OT Hours (${totalOtHours}) × Hourly Rate (₹${hourlyRate.toFixed(2)}) × ${otMultiplier}x = ₹${overtimePay.toLocaleString()}`,
    },
    earnedComponents: {
      BASIC: earnedBasic,
      HRA: earnedHra,
      CONVEYANCE: earnedConveyance,
      MEDICAL: earnedMedical,
      SPECIAL_ALLOWANCE: earnedSpecial,
      OVERTIME: overtimePay,
      BONUS: bonusIncentive,
    },
    deductionComponents: {
      EMPLOYEE_PF: employeePf,
      EMPLOYEE_ESIC: employeeEsic,
      PROFESSIONAL_TAX: professionalTax,
      TDS: monthlyTds,
      LOAN_EMI: loanEmiDeduction,
      OTHER_DEDUCTIONS: otherDeductions,
    },
    statutoryDetails: {
      pfWage,
      employeePf,
      employerEps,
      employerEpf,
      totalEmployerPf,
      esicWage,
      employeeEsic,
      employerEsic,
      ptState: empState,
      ptGrossConsidered: grossEarnings,
      ptAmount: professionalTax,
      annualTaxableIncome,
      annualEstimatedTax,
      monthlyTds,
    },
    otDetails: {
      approvedHours: totalOtHours,
      hourlyRate: Math.round(hourlyRate),
      multiplier: otMultiplier,
      totalOtPay: overtimePay,
    },
    summary: {
      grossEarnings,
      totalDeductions,
      netSalary,
      employerCost: totalEmployerCost,
    },
  };

  return {
    employeeId: emp.user_id,
    employeeCode: emp.employeeCode || 'EMP-001',
    employeeName: emp.fullName || 'Employee',
    department: emp.department_name || 'General',
    designation: emp.designation || 'Staff',
    bankName: emp.bank_name || '',
    accountNumber: emp.account_number || '',
    ifsc: emp.ifsc || '',
    pan: emp.pan || '',
    uan: emp.uan || '',

    calendarDays,
    workingDays,
    presentDays,
    absentDays,
    paidLeaveDays,
    lopDays,
    payableDays,
    overtimeHours: totalOtHours,

    basicSalary: earnedBasic,
    hra: earnedHra,
    conveyance: earnedConveyance,
    specialAllowance: earnedSpecial,
    medicalAllowance: earnedMedical,
    otherAllowances: 0,
    overtimePay,
    bonusIncentive,
    lopDeductionAmount,
    grossEarnings,

    employeePf,
    employeeEsic,
    professionalTax,
    tds: monthlyTds,
    loanEmiDeduction,
    otherDeductions,
    totalDeductions,

    netSalary,
    employerPf: totalEmployerPf,
    employerEsic,
    gratuityProvision,
    totalEmployerCost,

    calculationBreakdownJson: JSON.stringify(breakdown),
  };
}
