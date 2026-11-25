import { pool } from '../../database/index.js';

/**
 * system_settings holds platform-wide defaults under plain keys, and per-company overrides under
 * "c:<companyId>:<key>". A company's own value always wins over the shared default, so one company's
 * HR can never change another company's rules.
 */
export const COMPANY_PREFIX = 'c:';

export function companySettingKey(companyId: string, key: string): string {
  return `${COMPANY_PREFIX}${companyId}:${key}`;
}

function parse(v: any): any {
  try { return JSON.parse(v); } catch { return v; }
}

type Db = { query: (sql: string, params?: any[]) => Promise<any> };

/** Read the given keys for a company (falling back to the shared default). Returns parsed values. */
export async function readSettings(keys: string[], companyId?: string | null, db: Db = pool): Promise<Record<string, any>> {
  if (keys.length === 0) return {};
  const wanted = [...keys];
  if (companyId) wanted.push(...keys.map((k) => companySettingKey(companyId, k)));
  const [rows]: any = await db.query(
    `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (${wanted.map(() => '?').join(',')})`,
    wanted
  );
  const out: Record<string, any> = {};
  for (const r of rows) if (!String(r.setting_key).startsWith(COMPANY_PREFIX)) out[r.setting_key] = parse(r.setting_value);
  if (companyId) {
    const prefix = companySettingKey(companyId, '');
    for (const r of rows) if (String(r.setting_key).startsWith(prefix)) out[String(r.setting_key).slice(prefix.length)] = parse(r.setting_value);
  }
  return out;
}

/** All settings visible to a company: shared defaults overlaid with the company's own values. */
export async function readAllSettings(companyId?: string | null): Promise<Record<string, any>> {
  const [rows]: any = await pool.query('SELECT setting_key, setting_value FROM system_settings');
  const out: Record<string, any> = {};
  for (const r of rows) if (!String(r.setting_key).startsWith(COMPANY_PREFIX)) out[r.setting_key] = parse(r.setting_value);
  if (companyId) {
    const prefix = companySettingKey(companyId, '');
    for (const r of rows) if (String(r.setting_key).startsWith(prefix)) out[String(r.setting_key).slice(prefix.length)] = parse(r.setting_value);
  }
  return out;
}
