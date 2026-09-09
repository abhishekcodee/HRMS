import { Request, Response } from 'express';
import { pool } from '../../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import {
  formatIndianCurrency,
  numberToIndianWords,
} from '@hrms/shared';

/**
 * Salary Components Controller — Manages Salary Components and Structure Presets
 */

export const getSalaryComponents = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM salary_components WHERE is_active = 1 ORDER BY display_order ASC, name ASC');
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const createSalaryComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { company_id, name, type, calculation_method, value, display_order } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: { message: 'Component name is required' } });
      return;
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO salary_components (id, company_id, name, type, calculation_method, value, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        company_id || null,
        name,
        type || 'earning',
        calculation_method || 'fixed',
        value || 0,
        display_order || 0,
      ]
    );

    res.json({ success: true, data: { id, name } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getSalaryPresets = async (req: Request, res: Response): Promise<void> => {
  try {
    const [presets]: any = await pool.query('SELECT * FROM salary_structure_presets WHERE is_active = 1 ORDER BY name ASC');
    
    // Attach components for each preset
    const result = await Promise.all(
      presets.map(async (p: any) => {
        const [comps]: any = await pool.query(
          `SELECT spc.*, sc.name as component_name, sc.type as component_type
           FROM salary_preset_components spc
           JOIN salary_components sc ON spc.component_id = sc.id
           WHERE spc.preset_id = ?
           ORDER BY spc.sort_order ASC`,
          [p.id]
        );
        return { ...p, components: comps };
      })
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const calculateSalaryAnnexure = async (req: Request, res: Response): Promise<void> => {
  try {
    const { annual_ctc, preset_id, custom_components } = req.body;
    const ctcAnnual = parseFloat(annual_ctc) || 600000;
    const ctcMonthly = ctcAnnual / 12;

    // Fetch statutory settings for ceilings and rates
    const [statRows]: any = await pool.query('SELECT setting_key, setting_value FROM statutory_settings');
    const statMap: Record<string, string> = {};
    statRows.forEach((r: any) => {
      statMap[r.setting_key] = r.setting_value;
    });

    const pfWageCeiling = parseFloat(statMap.PF_WAGE_CEILING || '15000');
    const pfEmpRate = parseFloat(statMap.PF_EMPLOYER_PERCENT || '12') / 100;
    const esicWageCeiling = parseFloat(statMap.ESIC_WAGE_CEILING || '21000');
    const esicEmpRate = parseFloat(statMap.ESIC_EMPLOYER_PERCENT || '3.25') / 100;
    const gratuityRate = parseFloat(statMap.GRATUITY_PERCENT || '4.81') / 100;

    // Standard Calculation logic (50% Basic, 25% HRA, PF, ESIC, balancing Special Allowance)
    let basicMonthly = Math.round(ctcMonthly * 0.5);
    let hraMonthly = Math.round(basicMonthly * 0.5); // 50% of Basic

    // Retirals computation
    const pfEligibleWages = Math.min(basicMonthly, pfWageCeiling);
    let pfEmployerMonthly = Math.round(pfEligibleWages * pfEmpRate);

    let esicEmployerMonthly = 0;
    const estGrossBeforeEsic = basicMonthly + hraMonthly;
    if (estGrossBeforeEsic <= esicWageCeiling) {
      esicEmployerMonthly = Math.round(estGrossBeforeEsic * esicEmpRate);
    }

    let gratuityMonthly = Math.round(basicMonthly * gratuityRate);
    const totalRetiralsMonthly = pfEmployerMonthly + esicEmployerMonthly + gratuityMonthly;

    // Balancing figure for Special Allowance to reach exact CTC
    let specialAllowanceMonthly = ctcMonthly - (basicMonthly + hraMonthly + totalRetiralsMonthly);
    if (specialAllowanceMonthly < 0) {
      specialAllowanceMonthly = 0;
    }

    const grossMonthly = basicMonthly + hraMonthly + specialAllowanceMonthly;
    const computedTotalCtcMonthly = grossMonthly + totalRetiralsMonthly;

    const warnings: string[] = [];
    if (basicMonthly < 15000) {
      warnings.push('Basic Salary is below ₹15,000/month. Please verify minimum wage compliance.');
    }
    if (Math.abs(computedTotalCtcMonthly * 12 - ctcAnnual) > 100) {
      warnings.push('Calculated components have a minor rounding variance against requested CTC.');
    }

    const responseData = {
      ctcAnnual,
      ctcAnnualFormatted: formatIndianCurrency(ctcAnnual),
      ctcAnnualWords: numberToIndianWords(ctcAnnual),
      ctcMonthly,
      ctcMonthlyFormatted: formatIndianCurrency(ctcMonthly),
      grossMonthly,
      grossMonthlyFormatted: formatIndianCurrency(grossMonthly),
      grossAnnual: grossMonthly * 12,
      grossAnnualFormatted: formatIndianCurrency(grossMonthly * 12),
      retiralsMonthly: totalRetiralsMonthly,
      retiralsMonthlyFormatted: formatIndianCurrency(totalRetiralsMonthly),
      retiralsAnnual: totalRetiralsMonthly * 12,
      retiralsAnnualFormatted: formatIndianCurrency(totalRetiralsMonthly * 12),
      components: [
        {
          name: 'Basic Salary',
          type: 'earning',
          monthly: basicMonthly,
          monthlyFormatted: formatIndianCurrency(basicMonthly),
          annual: basicMonthly * 12,
          annualFormatted: formatIndianCurrency(basicMonthly * 12),
        },
        {
          name: 'House Rent Allowance (HRA)',
          type: 'earning',
          monthly: hraMonthly,
          monthlyFormatted: formatIndianCurrency(hraMonthly),
          annual: hraMonthly * 12,
          annualFormatted: formatIndianCurrency(hraMonthly * 12),
        },
        {
          name: 'Special Allowance (Balancing Component)',
          type: 'earning',
          monthly: specialAllowanceMonthly,
          monthlyFormatted: formatIndianCurrency(specialAllowanceMonthly),
          annual: specialAllowanceMonthly * 12,
          annualFormatted: formatIndianCurrency(specialAllowanceMonthly * 12),
        },
        {
          name: 'Employer PF Contribution (12%)',
          type: 'employer_contribution',
          monthly: pfEmployerMonthly,
          monthlyFormatted: formatIndianCurrency(pfEmployerMonthly),
          annual: pfEmployerMonthly * 12,
          annualFormatted: formatIndianCurrency(pfEmployerMonthly * 12),
        },
        {
          name: 'Employer ESIC Contribution (3.25%)',
          type: 'employer_contribution',
          monthly: esicEmployerMonthly,
          monthlyFormatted: formatIndianCurrency(esicEmployerMonthly),
          annual: esicEmployerMonthly * 12,
          annualFormatted: formatIndianCurrency(esicEmployerMonthly * 12),
        },
        {
          name: 'Gratuity Provision (4.81%)',
          type: 'employer_contribution',
          monthly: gratuityMonthly,
          monthlyFormatted: formatIndianCurrency(gratuityMonthly),
          annual: gratuityMonthly * 12,
          annualFormatted: formatIndianCurrency(gratuityMonthly * 12),
        },
      ],
      warnings,
    };

    res.json({ success: true, data: responseData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
