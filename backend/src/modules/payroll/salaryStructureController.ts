import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get All Salary Components
 */
export async function getSalaryComponents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, name, code, type, calculation_type as calculationType,
              percentage_basis_component_code as percentageBasisCode,
              percentage_value as percentageValue, is_taxable as isTaxable,
              is_pf_applicable as isPfApplicable, is_esic_applicable as isEsicApplicable,
              is_lop_deductible as isLopDeductible, is_active as isActive
       FROM salary_components 
       ORDER BY type ASC, name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch salary components.' } });
  }
}

/**
 * Create New Salary Component
 */
export async function createSalaryComponent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      type,
      calculationType,
      percentageBasisCode,
      percentageValue,
      isTaxable,
      isPfApplicable,
      isEsicApplicable,
      isLopDeductible,
    } = req.body;

    if (!name || !code || !type) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name, Code, and Type are required.' } });
      return;
    }

    const compId = uuidv4();
    await pool.query(
      `INSERT INTO salary_components 
       (id, name, code, type, calculation_type, percentage_basis_component_code, percentage_value, is_taxable, is_pf_applicable, is_esic_applicable, is_lop_deductible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        compId,
        name.trim(),
        code.trim().toUpperCase(),
        type,
        calculationType || 'fixed',
        percentageBasisCode || null,
        Number(percentageValue) || 0.0,
        isTaxable ? 1 : 0,
        isPfApplicable ? 1 : 0,
        isEsicApplicable ? 1 : 0,
        isLopDeductible ? 1 : 0,
      ]
    );

    res.status(201).json({ success: true, message: 'Salary component created successfully.', data: { id: compId, name, code } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create component.' } });
  }
}

/**
 * Get All Salary Structures
 */
export async function getSalaryStructures(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, name, code, description, is_active as isActive, created_at as createdAt 
       FROM salary_structures 
       ORDER BY name ASC`
    );

    for (const struct of rows) {
      const [comps]: any = await pool.query(
        `SELECT sc.id, sc.component_code as componentCode, sc.amount_type as amountType,
                sc.default_value as defaultValue, sc.percentage_of as percentageOf,
                c.name as componentName, c.type as componentType
         FROM salary_structure_components sc
         JOIN salary_components c ON c.code = sc.component_code
         WHERE sc.structure_id = ?
         ORDER BY sc.display_order ASC`,
        [struct.id]
      );
      struct.components = comps;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch salary structures.' } });
  }
}

/**
 * Create Salary Structure Template
 */
export async function createSalaryStructure(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, code, description, components } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Structure Name and Code are required.' } });
      return;
    }

    const structId = uuidv4();
    await pool.query(
      `INSERT INTO salary_structures (id, name, code, description) VALUES (?, ?, ?, ?)`,
      [structId, name.trim(), code.trim().toUpperCase(), description || null]
    );

    if (Array.isArray(components)) {
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        const itemMapId = uuidv4();
        await pool.query(
          `INSERT INTO salary_structure_components
           (id, structure_id, component_id, component_code, amount_type, default_value, percentage_of, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemMapId,
            structId,
            comp.componentId || comp.id || uuidv4(),
            comp.componentCode || comp.code,
            comp.amountType || 'fixed',
            Number(comp.defaultValue) || 0.0,
            comp.percentageOf || null,
            i + 1,
          ]
        );
      }
    }

    res.status(201).json({ success: true, message: 'Salary structure template created successfully.', data: { id: structId, name, code } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create structure.' } });
  }
}

/**
 * Assign Salary Structure to Employee
 */
export async function assignEmployeeSalaryStructure(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employeeId, structureId, ctc, monthlyGross, effectiveFrom, structureSnapshot } = req.body;
    if (!employeeId || !ctc || !effectiveFrom) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee ID, CTC, and Effective Date are required.' } });
      return;
    }

    // Deactivate previous active structure for employee
    await pool.query(`UPDATE employee_salary_structures SET is_active = 0 WHERE employee_id = ?`, [employeeId]);

    const assignId = uuidv4();
    const calculatedMonthlyGross = Number(monthlyGross) || Number(ctc) / 12;

    await pool.query(
      `INSERT INTO employee_salary_structures
       (id, employee_id, structure_id, ctc, monthly_gross, effective_from, is_active, structure_snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        assignId,
        employeeId,
        structureId || 'struct-std-1',
        Number(ctc),
        calculatedMonthlyGross,
        effectiveFrom,
        structureSnapshot ? JSON.stringify(structureSnapshot) : null,
      ]
    );

    // Also update base salary on employee_profiles
    await pool.query(`UPDATE employee_profiles SET salary = ? WHERE user_id = ? OR id = ?`, [calculatedMonthlyGross, employeeId, employeeId]);

    res.status(201).json({ success: true, message: 'Salary structure assigned to employee successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to assign salary structure.' } });
  }
}
