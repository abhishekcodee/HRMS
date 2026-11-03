import { pool } from '../database/index.js';

export interface EmployeeLimitCheckResult {
  allowed: boolean;
  currentActive: number;
  maxLimit: number;
  companyName: string;
  message?: string;
}

export const EXACT_LIMIT_REACHED_MESSAGE =
  'Your employee limit has been reached. Please contact the Super Admin to increase your employee limit.';

/**
 * Checks whether adding `countToAdd` active employees for a company is allowed.
 * - If current active employees + countToAdd > max_employees, denies creation.
 * - Does NOT delete existing records if current count > limit, but prevents any addition.
 * - Strictly tenant-isolated: only queries the target company_id.
 */
export async function checkCompanyEmployeeLimit(
  companyId: string | null | undefined,
  countToAdd: number = 1
): Promise<EmployeeLimitCheckResult> {
  if (!companyId) {
    return { allowed: true, currentActive: 0, maxLimit: 999999, companyName: 'System' };
  }

  const [cRows]: any = await pool.query(
    'SELECT id, name, max_employees FROM companies WHERE id = ?',
    [companyId]
  );

  if (cRows.length === 0) {
    return { allowed: true, currentActive: 0, maxLimit: 999999, companyName: 'Unknown' };
  }

  const company = cRows[0];
  const maxLimit =
    typeof company.max_employees === 'number' && company.max_employees > 0
      ? company.max_employees
      : 100;

  const [uRows]: any = await pool.query(
    `SELECT COUNT(*) as active_count 
     FROM users 
     WHERE company_id = ? 
       AND status = 'active' 
       AND role != 'super_admin'`,
    [companyId]
  );

  const currentActive = Number(uRows[0]?.active_count || 0);

  if (currentActive + countToAdd > maxLimit) {
    return {
      allowed: false,
      currentActive,
      maxLimit,
      companyName: company.name,
      message: EXACT_LIMIT_REACHED_MESSAGE,
    };
  }

  return {
    allowed: true,
    currentActive,
    maxLimit,
    companyName: company.name,
  };
}
