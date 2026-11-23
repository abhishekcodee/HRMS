import { Request, Response } from 'express';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { ensureBiometricSchema } from './biometricSchema.js';
import {
  ParsedPunch,
  buildHandshakeResponse,
  countRecords,
  numericSuffix,
  parseAttlog,
  parseClockToMinutes,
  parseDeviceCmdResults,
  parseInfoParam,
  parseOperlogUsers,
  statusLabel,
  verifyLabel,
} from './admsProtocol.js';

/* ============================================================================
 * Helpers
 * ========================================================================== */

type Db = { query: (sql: string, params?: any[]) => Promise<any> };

function getSn(req: Request): string {
  const raw = (req.query.SN ?? req.query.sn ?? '') as string;
  return String(raw).trim().slice(0, 100);
}

function clientIp(req: Request): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || req.ip || req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}

function sendText(res: Response, body: string, status = 200): void {
  res.status(status).type('text/plain').send(body);
}

function rawBody(req: Request): string {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return '';
}

function isSuper(req: AuthRequest): boolean {
  return Boolean(req.isSuperAdmin || req.user?.isSuperAdmin);
}

interface DeviceRow {
  id: string;
  device_sn: string;
  company_id: string | null;
  attlog_stamp: string | null;
  operlog_stamp: string | null;
}

/** Upsert the device heartbeat; auto-registers unknown serial numbers as unclaimed devices. */
async function touchDevice(db: Db, sn: string, ip: string, extra: Record<string, any> = {}): Promise<DeviceRow> {
  const [rows]: any = await db.query(
    'SELECT id, device_sn, company_id, attlog_stamp, operlog_stamp FROM biometric_devices WHERE device_sn = ?',
    [sn]
  );

  if (rows.length === 0) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO biometric_devices (id, device_sn, device_name, ip_address, port, location, status, last_ping_at)
       VALUES (?, ?, ?, ?, 4370, 'Auto-discovered (not yet registered)', 'ONLINE', NOW())`,
      [id, sn, `eSSL Device ${sn}`, ip]
    );
    logger.info(`ADMS: new biometric device auto-discovered SN=${sn} from ${ip}. Register it in HRMS to start applying punches.`);
    return { id, device_sn: sn, company_id: null, attlog_stamp: null, operlog_stamp: null };
  }

  const sets = ["status = 'ONLINE'", 'last_ping_at = NOW()', 'ip_address = ?'];
  const params: any[] = [ip];
  for (const [col, val] of Object.entries(extra)) {
    if (val === undefined || val === null) continue;
    sets.push(`${col} = ?`);
    params.push(val);
  }
  params.push(sn);
  await db.query(`UPDATE biometric_devices SET ${sets.join(', ')} WHERE device_sn = ?`, params);
  return rows[0];
}

/* ---------------------------------------------------------------------------
 * Employee resolution: device PIN -> HRMS user
 * ------------------------------------------------------------------------- */

interface UserCandidate {
  id: string;
  employee_id: string;
  biometric_pin: string | null;
  company_id: string | null;
}

class PinResolver {
  private users: UserCandidate[] | null = null;
  constructor(private db: Db, private companyId: string) {}

  private async load(): Promise<UserCandidate[]> {
    if (!this.users) {
      const [rows]: any = await this.db.query(
        `SELECT id, employee_id, biometric_pin, company_id FROM users
         WHERE company_id = ? AND role <> 'super_admin'`,
        [this.companyId]
      );
      this.users = rows;
    }
    return this.users!;
  }

  /**
   * Matching order:
   *  1. users.biometric_pin equals the device PIN (explicit mapping set in HRMS)
   *  2. users.employee_id equals the device PIN (e.g. PIN "EMP001")
   *  3. trailing number of employee_id equals a numeric PIN (AMPL-00007 <-> 7), only if unambiguous
   */
  async resolve(pin: string): Promise<string | null> {
    const users = await this.load();
    const p = pin.trim();
    const explicit = users.find((u) => u.biometric_pin && u.biometric_pin.trim() === p);
    if (explicit) return explicit.id;

    const direct = users.find((u) => !u.biometric_pin && u.employee_id?.toLowerCase() === p.toLowerCase());
    if (direct) return direct.id;

    if (/^\d+$/.test(p)) {
      const n = Number(p);
      const matches = users.filter((u) => !u.biometric_pin && numericSuffix(u.employee_id) === n);
      if (matches.length === 1) return matches[0].id;
    }
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Attendance computation
 * ------------------------------------------------------------------------- */

interface ShiftRules {
  startMinutes: number;
  graceMinutes: number;
  fullDayHours: number;
}

async function loadGlobalRules(db: Db): Promise<ShiftRules> {
  const rules: ShiftRules = { startMinutes: 9 * 60, graceMinutes: 15, fullDayHours: 8 };
  try {
    const [rows]: any = await db.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('shiftStart', 'gracePeriod', 'fullDayHours')"
    );
    for (const r of rows) {
      let v: any = r.setting_value;
      try { v = JSON.parse(v); } catch (_) { /* plain string */ }
      if (r.setting_key === 'shiftStart') rules.startMinutes = parseClockToMinutes(String(v), rules.startMinutes);
      if (r.setting_key === 'gracePeriod' && !isNaN(Number(v))) rules.graceMinutes = Number(v);
      if (r.setting_key === 'fullDayHours' && !isNaN(Number(v)) && Number(v) > 0) rules.fullDayHours = Number(v);
    }
  } catch (_) { /* settings table missing -> defaults */ }
  return rules;
}

async function loadShiftStartForUser(db: Db, userId: string): Promise<number | null> {
  try {
    const [rows]: any = await db.query(
      `SELECT ms.start_time FROM employee_profiles ep
       JOIN master_shifts ms ON ms.name = ep.shift_name
       WHERE ep.user_id = ? LIMIT 1`,
      [userId]
    );
    if (rows.length > 0 && rows[0].start_time) return parseClockToMinutes(rows[0].start_time, NaN);
  } catch (_) { /* optional tables */ }
  return null;
}

function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function hhmm(dt: string): string {
  return dt.slice(11, 16);
}

function minutesOf(dt: string): number {
  return Number(dt.slice(11, 13)) * 60 + Number(dt.slice(14, 16));
}

function toDbDateTime(value: any): string {
  if (value instanceof Date) {
    // mysql2 returns DATETIME as a Date in the server's local zone; read it back the same way.
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  return String(value).replace('T', ' ').slice(0, 19);
}

/**
 * Recalculate one employee-day from all biometric punches of that day.
 * First punch = clock-in, last punch = clock-out (if at least 2 distinct punches).
 */
export async function recomputeAttendanceDay(
  db: Db,
  userId: string,
  companyId: string | null,
  workDate: string,
  globalRules?: ShiftRules
): Promise<void> {
  const [punches]: any = await db.query(
    `SELECT DATE_FORMAT(punch_time, '%Y-%m-%d %H:%i:%s') as punch_time FROM biometric_punch_logs
     WHERE user_id = ? AND punch_time >= ? AND punch_time < ?
     ORDER BY punch_time ASC`,
    [userId, `${workDate} 00:00:00`, `${nextDate(workDate)} 00:00:00`]
  );
  if (punches.length === 0) return;

  const first = toDbDateTime(punches[0].punch_time);
  const last = toDbDateTime(punches[punches.length - 1].punch_time);

  const rules = globalRules || (await loadGlobalRules(db));
  const userShiftStart = await loadShiftStartForUser(db, userId);
  const shiftStart = userShiftStart !== null && !isNaN(userShiftStart) ? userShiftStart : rules.startMinutes;

  const clockIn = hhmm(first);
  let clockOut: string | null = null;
  let workHours = 0;
  if (punches.length > 1 && last > first) {
    clockOut = hhmm(last);
    const diffMinutes = (new Date(last.replace(' ', 'T') + 'Z').getTime() - new Date(first.replace(' ', 'T') + 'Z').getTime()) / 60000;
    workHours = Math.round((diffMinutes / 60) * 100) / 100;
  }

  const lateBy = minutesOf(first) - shiftStart;
  const isLate = lateBy > rules.graceMinutes;
  const status = isLate ? 'LATE' : 'PRESENT';
  const lateMinutes = isLate ? lateBy : 0;
  const overtime = Math.max(0, Math.round((workHours - rules.fullDayHours) * 100) / 100);

  const [existing]: any = await db.query('SELECT id FROM attendance WHERE user_id = ? AND work_date = ? LIMIT 1', [userId, workDate]);
  if (existing.length === 0) {
    await db.query(
      `INSERT INTO attendance (id, company_id, user_id, work_date, clock_in, clock_out, work_hours, status, late_minutes, overtime_hours, source, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BIOMETRIC', ?)`,
      [uuidv4(), companyId, userId, workDate, clockIn, clockOut, workHours, status, lateMinutes, overtime, `eSSL biometric (${punches.length} punch${punches.length > 1 ? 'es' : ''})`]
    );
  } else {
    await db.query(
      `UPDATE attendance
       SET clock_in = ?, clock_out = ?, work_hours = ?, status = ?, late_minutes = ?, overtime_hours = ?,
           source = 'BIOMETRIC', notes = ?, company_id = COALESCE(company_id, ?)
       WHERE id = ?`,
      [clockIn, clockOut, workHours, status, lateMinutes, overtime, `eSSL biometric (${punches.length} punch${punches.length > 1 ? 'es' : ''})`, companyId, existing[0].id]
    );
  }
}

/**
 * Store punches (deduplicated), resolve them to employees and recompute affected attendance days.
 */
async function ingestPunches(db: Db, device: DeviceRow, punches: ParsedPunch[]): Promise<{ stored: number; matched: number }> {
  const resolver = device.company_id ? new PinResolver(db, device.company_id) : null;
  const affected = new Map<string, string>(); // `${userId}|${date}` -> userId
  let stored = 0;
  let matched = 0;

  for (const p of punches) {
    const [dup]: any = await db.query(
      'SELECT id FROM biometric_punch_logs WHERE device_sn = ? AND employee_id = ? AND punch_time = ? LIMIT 1',
      [device.device_sn, p.pin, p.punchTime]
    );
    if (dup.length > 0) continue;

    const userId = resolver ? await resolver.resolve(p.pin) : null;
    await db.query(
      `INSERT INTO biometric_punch_logs
         (id, device_sn, company_id, employee_id, user_id, punch_time, verify_type, punch_state, raw_payload, processed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), device.device_sn, device.company_id, p.pin, userId, p.punchTime, verifyLabel(p.verifyCode), p.status, p.raw.slice(0, 1000), userId ? 1 : 0]
    );
    stored++;
    if (userId) {
      matched++;
      affected.set(`${userId}|${p.punchTime.slice(0, 10)}`, userId);
    }
  }

  if (affected.size > 0) {
    const rules = await loadGlobalRules(db);
    for (const [key, userId] of affected) {
      const workDate = key.split('|')[1];
      try {
        await recomputeAttendanceDay(db, userId, device.company_id, workDate, rules);
      } catch (err) {
        logger.error(`ADMS: attendance recompute failed for user ${userId} on ${workDate}:`, err);
      }
    }
  }

  return { stored, matched };
}

/**
 * Re-run PIN matching for punches that are not yet linked to an employee
 * (e.g. after a device is registered or a PIN mapping is changed).
 */
async function reprocessUnmatched(db: Db, companyId: string, deviceSn?: string, pin?: string): Promise<number> {
  const where = ['p.user_id IS NULL'];
  const params: any[] = [];
  if (deviceSn) {
    where.push('p.device_sn = ?');
    params.push(deviceSn);
  } else {
    where.push('d.company_id = ?');
    params.push(companyId);
  }
  if (pin) {
    where.push('p.employee_id = ?');
    params.push(pin);
  }

  const [rows]: any = await db.query(
    `SELECT p.id, p.employee_id, p.punch_time FROM biometric_punch_logs p
     JOIN biometric_devices d ON d.device_sn = p.device_sn
     WHERE ${where.join(' AND ')} LIMIT 20000`,
    params
  );

  const resolver = new PinResolver(db, companyId);
  const affected = new Map<string, string>();
  let fixed = 0;
  for (const r of rows) {
    const userId = await resolver.resolve(String(r.employee_id));
    if (!userId) continue;
    await db.query('UPDATE biometric_punch_logs SET user_id = ?, company_id = ?, processed = 1 WHERE id = ?', [userId, companyId, r.id]);
    affected.set(`${userId}|${toDbDateTime(r.punch_time).slice(0, 10)}`, userId);
    fixed++;
  }

  const rules = await loadGlobalRules(db);
  for (const [key, userId] of affected) {
    await recomputeAttendanceDay(db, userId, companyId, key.split('|')[1], rules);
  }
  return fixed;
}

/* ============================================================================
 * ADMS device endpoints (unauthenticated – called by the terminal itself)
 * ========================================================================== */

/**
 * GET /iclock/cdata?SN=XXXX&options=all&pushver=...
 * Initial handshake. Returns the push configuration so the device starts uploading in real time.
 */
export async function cdataGET(req: Request, res: Response): Promise<void> {
  const sn = getSn(req);
  if (!sn) {
    sendText(res, 'OK');
    return;
  }

  let device: DeviceRow | null = null;
  try {
    await ensureBiometricSchema();
    device = await touchDevice(pool, sn, clientIp(req), {
      firmware: (req.query.pushver as string) ? `pushver ${req.query.pushver}` : undefined,
    });
  } catch (err) {
    logger.error('ADMS handshake error:', err);
  }

  if (req.query.options !== undefined) {
    sendText(res, buildHandshakeResponse({ sn, attlogStamp: device?.attlog_stamp, operlogStamp: device?.operlog_stamp }));
    return;
  }
  sendText(res, 'OK');
}

/**
 * POST /iclock/cdata?SN=XXXX&table=ATTLOG|OPERLOG|ATTPHOTO|rtlog&Stamp=NNN
 * Receives attendance logs and user information pushed by the device.
 */
export async function cdataPOST(req: Request, res: Response): Promise<void> {
  const sn = getSn(req);
  const table = String(req.query.table || req.query.Table || 'ATTLOG').toUpperCase();
  const stamp = (req.query.Stamp || req.query.stamp) as string | undefined;
  const body = rawBody(req);

  if (!sn) {
    sendText(res, 'OK: 0');
    return;
  }

  try {
    await ensureBiometricSchema();
    const device = await touchDevice(pool, sn, clientIp(req));

    if (table === 'ATTLOG' || table === 'RTLOG') {
      const punches = parseAttlog(body);
      const { stored, matched } = await ingestPunches(pool, device, punches);
      await pool.query(
        `UPDATE biometric_devices SET last_punch_at = IF(? > 0, NOW(), last_punch_at)${stamp && table === 'ATTLOG' ? ', attlog_stamp = ?' : ''} WHERE device_sn = ?`,
        stamp && table === 'ATTLOG' ? [stored, String(stamp).slice(0, 50), sn] : [stored, sn]
      );
      logger.info(`ADMS ${table} SN=${sn}: received=${punches.length} new=${stored} matched=${matched}${device.company_id ? '' : ' (device not registered to a company yet)'}`);
      sendText(res, `OK: ${punches.length}`);
      return;
    }

    if (table === 'OPERLOG' || table === 'USERINFO') {
      const users = parseOperlogUsers(body);
      for (const u of users) {
        await pool.query(
          `INSERT INTO biometric_device_users (id, device_sn, pin, name, privilege, card)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), privilege = VALUES(privilege), card = VALUES(card)`,
          [uuidv4(), sn, u.pin.slice(0, 50), u.name.slice(0, 150), u.privilege.slice(0, 10), u.card.slice(0, 50)]
        );
      }
      if (stamp && table === 'OPERLOG') {
        await pool.query('UPDATE biometric_devices SET operlog_stamp = ? WHERE device_sn = ?', [String(stamp).slice(0, 50), sn]);
      }
      sendText(res, `OK: ${countRecords(body)}`);
      return;
    }

    // ATTPHOTO, BIODATA, options, etc. – acknowledge so the device does not retry forever.
    sendText(res, `OK: ${countRecords(body)}`);
  } catch (err) {
    logger.error(`ADMS cdata POST error (SN=${sn}, table=${table}):`, err);
    // Non-OK response makes the device keep the data and retry later.
    sendText(res, 'ERROR', 500);
  }
}

/**
 * GET /iclock/getrequest?SN=XXXX&INFO=Ver,UserCount,FPCount,AttCount,IP,...
 * Heartbeat. Returns queued commands (`C:<id>:<command>`) or `OK`.
 */
export async function getRequest(req: Request, res: Response): Promise<void> {
  const sn = getSn(req);
  if (!sn) {
    sendText(res, 'OK');
    return;
  }

  try {
    await ensureBiometricSchema();
    const info = parseInfoParam(req.query.INFO as string | undefined);
    await touchDevice(pool, sn, info.ip || clientIp(req), {
      firmware: info.firmware?.slice(0, 100),
      user_count: info.userCount,
      att_count: info.attCount,
    });

    const [cmds]: any = await pool.query(
      "SELECT id, command FROM biometric_device_commands WHERE device_sn = ? AND status = 'PENDING' ORDER BY id ASC LIMIT 10",
      [sn]
    );
    if (cmds.length > 0) {
      const ids = cmds.map((c: any) => c.id);
      await pool.query(
        `UPDATE biometric_device_commands SET status = 'SENT', sent_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      sendText(res, cmds.map((c: any) => `C:${c.id}:${c.command}`).join('\r\n') + '\r\n');
      return;
    }
  } catch (err) {
    logger.error('ADMS getrequest error:', err);
  }
  sendText(res, 'OK');
}

/**
 * POST /iclock/devicecmd?SN=XXXX  body: ID=1&Return=0&CMD=DATA
 * Device reports the result of commands it executed.
 */
export async function deviceCmd(req: Request, res: Response): Promise<void> {
  const sn = getSn(req);
  try {
    await ensureBiometricSchema();
    for (const r of parseDeviceCmdResults(rawBody(req))) {
      if (!/^\d+$/.test(r.id)) continue;
      await pool.query(
        `UPDATE biometric_device_commands SET status = ?, return_code = ?, completed_at = NOW() WHERE id = ? AND device_sn = ?`,
        [r.returnCode === '0' || Number(r.returnCode) > 0 ? 'DONE' : 'FAILED', r.returnCode.slice(0, 20), Number(r.id), sn]
      );
    }
  } catch (err) {
    logger.error('ADMS devicecmd error:', err);
  }
  sendText(res, 'OK');
}

/** GET /iclock/ping – keep-alive used by some firmwares while uploading large batches. */
export function pingDevice(_req: Request, res: Response): void {
  sendText(res, 'OK');
}

/* ============================================================================
 * Management endpoints (authenticated, tenant scoped)
 * ========================================================================== */

/** Load a device the caller is allowed to manage. */
async function findOwnedDevice(req: AuthRequest, idOrSn: { id?: string; sn?: string }): Promise<any | null> {
  const companyId = getTenantId(req);
  const col = idOrSn.id ? 'id' : 'device_sn';
  const val = idOrSn.id || idOrSn.sn;
  const [rows]: any = await pool.query(`SELECT * FROM biometric_devices WHERE ${col} = ?`, [val]);
  if (rows.length === 0) return null;
  const dev = rows[0];
  if (isSuper(req) || dev.company_id === companyId) return dev;
  return null;
}

/**
 * GET /api/v1/zkteco/devices
 */
export async function getBiometricDevices(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBiometricSchema();
    const companyId = getTenantId(req);
    const scopeSql = isSuper(req) && !req.headers['x-tenant-id'] ? '' : 'WHERE d.company_id = ?';
    const [rows]: any = await pool.query(
      `SELECT d.id, d.device_sn as deviceSn, d.device_name as deviceName, d.ip_address as ipAddress, d.port, d.location,
              d.company_id as companyId, d.firmware, d.user_count as userCount, d.att_count as attCount,
              d.last_ping_at as lastPingAt, d.last_punch_at as lastPunchAt, d.created_at as createdAt,
              CASE WHEN d.last_ping_at IS NOT NULL AND TIMESTAMPDIFF(SECOND, d.last_ping_at, NOW()) <= 180 THEN 'ONLINE' ELSE 'OFFLINE' END as status,
              (SELECT COUNT(*) FROM biometric_punch_logs p WHERE p.device_sn = d.device_sn) as punchCount,
              (SELECT COUNT(*) FROM biometric_punch_logs p WHERE p.device_sn = d.device_sn AND p.user_id IS NULL) as unmatchedCount
       FROM biometric_devices d ${scopeSql}
       ORDER BY d.created_at DESC`,
      scopeSql ? [companyId] : []
    );
    res.json({ success: true, data: rows.map((r: any) => ({ ...r, registered: Boolean(r.companyId) })) });
  } catch (err: any) {
    logger.error('getBiometricDevices error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to load biometric devices.' } });
  }
}

/**
 * POST /api/v1/zkteco/devices
 * Registers a device by serial number, or claims an auto-discovered one for the caller's company.
 */
export async function registerBiometricDevice(req: AuthRequest, res: Response): Promise<void> {
  const { deviceSn, deviceName, ipAddress, port, location } = req.body || {};
  const sn = String(deviceSn || '').trim();

  if (!sn || !deviceName) {
    res.status(400).json({ success: false, error: { message: 'Device Serial Number and Name are required.' } });
    return;
  }

  try {
    await ensureBiometricSchema();
    const companyId = getTenantId(req);
    const [existing]: any = await pool.query('SELECT id, company_id FROM biometric_devices WHERE device_sn = ?', [sn]);

    let id: string;
    if (existing.length > 0) {
      const dev = existing[0];
      if (dev.company_id && dev.company_id !== companyId && !isSuper(req)) {
        res.status(409).json({ success: false, error: { message: 'This device serial number is already registered to another company.' } });
        return;
      }
      id = dev.id;
      await pool.query(
        `UPDATE biometric_devices SET device_name = ?, location = ?, port = ?, company_id = ?,
                ip_address = COALESCE(NULLIF(?, ''), ip_address)
         WHERE id = ?`,
        [String(deviceName).slice(0, 150), String(location || 'Office').slice(0, 150), Number(port) || 4370, companyId, ipAddress || '', id]
      );
    } else {
      id = uuidv4();
      await pool.query(
        `INSERT INTO biometric_devices (id, device_sn, device_name, ip_address, port, location, status, last_ping_at, company_id)
         VALUES (?, ?, ?, ?, ?, ?, 'OFFLINE', NULL, ?)`,
        [id, sn, String(deviceName).slice(0, 150), ipAddress || null, Number(port) || 4370, String(location || 'Office').slice(0, 150), companyId]
      );
    }

    // Punches the device sent before it was registered can now be attributed.
    await pool.query('UPDATE biometric_punch_logs SET company_id = ? WHERE device_sn = ? AND company_id IS NULL', [companyId, sn]);
    const reprocessed = await reprocessUnmatched(pool, companyId, sn);

    res.json({
      success: true,
      message: existing.length > 0
        ? `Device ${sn} registered to your company.${reprocessed ? ` ${reprocessed} earlier punches were applied to attendance.` : ''}`
        : `Device ${sn} registered. It will show ONLINE once it contacts the server.`,
      data: { id, deviceSn: sn, deviceName },
    });
  } catch (err: any) {
    logger.error('registerBiometricDevice error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to register device.' } });
  }
}

/**
 * DELETE /api/v1/zkteco/devices/:id
 */
export async function deleteBiometricDevice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dev = await findOwnedDevice(req, { id: req.params.id });
    if (!dev) {
      res.status(404).json({ success: false, error: { message: 'Device not found.' } });
      return;
    }
    await pool.query('DELETE FROM biometric_devices WHERE id = ?', [dev.id]);
    await pool.query("DELETE FROM biometric_device_commands WHERE device_sn = ? AND status = 'PENDING'", [dev.device_sn]);
    res.json({ success: true, message: 'Biometric device removed. Its punch history is kept.' });
  } catch (err: any) {
    logger.error('deleteBiometricDevice error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to remove device.' } });
  }
}

/**
 * GET /api/v1/zkteco/raw-logs?date=YYYY-MM-DD&limit=200&unmatched=1
 */
export async function getRawBiometricLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBiometricSchema();
    const companyId = getTenantId(req);
    const where: string[] = [];
    const params: any[] = [];

    if (!(isSuper(req) && !req.headers['x-tenant-id'])) {
      where.push('l.company_id = ?');
      params.push(companyId);
    }
    if (req.user?.role === 'employee') {
      where.push('l.user_id = ?');
      params.push(req.user.id);
    }
    const date = String(req.query.date || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      where.push('l.punch_time >= ? AND l.punch_time < ?');
      params.push(`${date} 00:00:00`, `${nextDate(date)} 00:00:00`);
    }
    if (req.query.unmatched === '1') where.push('l.user_id IS NULL');

    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
    const [rows]: any = await pool.query(
      `SELECT l.id, l.device_sn as deviceSn, l.employee_id as devicePin, u.employee_id as employeeId,
              u.full_name as employeeName, l.user_id as userId,
              DATE_FORMAT(l.punch_time, '%Y-%m-%d %H:%i:%s') as punchTime,
              l.verify_type as verifyType, l.punch_state as punchState, l.created_at as createdAt
       FROM biometric_punch_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY l.punch_time DESC LIMIT ${limit}`,
      params
    );
    res.json({
      success: true,
      data: rows.map((r: any) => ({
        ...r,
        employeeId: r.employeeId || r.devicePin,
        punchType: statusLabel(r.punchState),
        matched: Boolean(r.userId),
      })),
    });
  } catch (err: any) {
    logger.error('getRawBiometricLogs error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to load punch logs.' } });
  }
}

/**
 * GET /api/v1/zkteco/pin-mappings
 * Lists every PIN seen on the company's devices together with the HRMS employee it maps to.
 */
export async function getPinMappings(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBiometricSchema();
    const companyId = getTenantId(req);
    const [pins]: any = await pool.query(
      `SELECT pin, MAX(name) as deviceName, MAX(lastSeen) as lastSeen, SUM(punches) as punches, SUM(unmatched) as unmatched FROM (
         SELECT p.employee_id as pin, NULL as name, MAX(p.punch_time) as lastSeen, COUNT(*) as punches,
                SUM(CASE WHEN p.user_id IS NULL THEN 1 ELSE 0 END) as unmatched
         FROM biometric_punch_logs p JOIN biometric_devices d ON d.device_sn = p.device_sn
         WHERE d.company_id = ? GROUP BY p.employee_id
         UNION ALL
         SELECT du.pin, du.name, NULL, 0, 0
         FROM biometric_device_users du JOIN biometric_devices d ON d.device_sn = du.device_sn
         WHERE d.company_id = ?
       ) x GROUP BY pin ORDER BY pin`,
      [companyId, companyId]
    );

    const resolver = new PinResolver(pool, companyId);
    const [users]: any = await pool.query(
      "SELECT id, employee_id as employeeId, full_name as fullName, biometric_pin as biometricPin FROM users WHERE company_id = ? AND role <> 'super_admin' ORDER BY employee_id",
      [companyId]
    );
    const byId = new Map(users.map((u: any) => [u.id, u]));

    const data = [];
    for (const p of pins) {
      const userId = await resolver.resolve(String(p.pin));
      const u: any = userId ? byId.get(userId) : null;
      data.push({
        pin: String(p.pin),
        deviceName: p.deviceName || null,
        punches: Number(p.punches) || 0,
        unmatched: Number(p.unmatched) || 0,
        lastSeen: p.lastSeen ? toDbDateTime(p.lastSeen) : null,
        userId: u?.id || null,
        employeeId: u?.employeeId || null,
        employeeName: u?.fullName || null,
        explicit: Boolean(u?.biometricPin),
      });
    }

    res.json({ success: true, data: { pins: data, employees: users } });
  } catch (err: any) {
    logger.error('getPinMappings error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to load PIN mappings.' } });
  }
}

/**
 * PUT /api/v1/zkteco/pin-mappings  { userId, biometricPin }
 * Explicitly links an employee to a device User ID. Empty biometricPin clears the mapping.
 */
export async function setPinMapping(req: AuthRequest, res: Response): Promise<void> {
  const { userId, biometricPin } = req.body || {};
  const pin = String(biometricPin ?? '').trim();
  if (!userId) {
    res.status(400).json({ success: false, error: { message: 'userId is required.' } });
    return;
  }
  if (pin && !/^[A-Za-z0-9_-]{1,50}$/.test(pin)) {
    res.status(400).json({ success: false, error: { message: 'Device User ID may contain only letters, digits, "-" and "_".' } });
    return;
  }

  try {
    await ensureBiometricSchema();
    const companyId = getTenantId(req);
    const [u]: any = await pool.query('SELECT id FROM users WHERE id = ? AND company_id = ?', [userId, companyId]);
    if (u.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Employee not found in your company.' } });
      return;
    }
    if (pin) {
      const [taken]: any = await pool.query(
        'SELECT employee_id FROM users WHERE company_id = ? AND biometric_pin = ? AND id <> ?',
        [companyId, pin, userId]
      );
      if (taken.length > 0) {
        res.status(409).json({ success: false, error: { message: `Device User ID ${pin} is already linked to ${taken[0].employee_id}.` } });
        return;
      }
    }

    await pool.query('UPDATE users SET biometric_pin = ? WHERE id = ?', [pin || null, userId]);

    // Re-link existing punches of this PIN (they may previously have matched someone else by fallback rules).
    if (pin) {
      const [prev]: any = await pool.query(
        `SELECT DISTINCT p.user_id, DATE_FORMAT(p.punch_time, '%Y-%m-%d') as d FROM biometric_punch_logs p
         JOIN biometric_devices dv ON dv.device_sn = p.device_sn
         WHERE dv.company_id = ? AND p.employee_id = ? AND p.user_id IS NOT NULL AND p.user_id <> ?`,
        [companyId, pin, userId]
      );
      await pool.query(
        `UPDATE biometric_punch_logs p JOIN biometric_devices dv ON dv.device_sn = p.device_sn
         SET p.user_id = NULL, p.processed = 0
         WHERE dv.company_id = ? AND p.employee_id = ? AND p.user_id IS NOT NULL AND p.user_id <> ?`,
        [companyId, pin, userId]
      );
      const rules = await loadGlobalRules(pool);
      for (const r of prev) await recomputeAttendanceDay(pool, r.user_id, companyId, r.d, rules);
    }
    const fixed = await reprocessUnmatched(pool, companyId, undefined, pin || undefined);

    res.json({ success: true, message: pin ? `Linked device User ID ${pin}. ${fixed} punch(es) applied to attendance.` : 'Mapping cleared.' });
  } catch (err: any) {
    logger.error('setPinMapping error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to save mapping.' } });
  }
}

/**
 * POST /api/v1/zkteco/devices/:id/commands  { type: 'SYNC_ATTLOG' | 'SYNC_USERS' | 'INFO' | 'REBOOT', from?, to? }
 * Queues a command that the device picks up on its next heartbeat (within ~10 seconds).
 */
export async function queueDeviceCommand(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBiometricSchema();
    const dev = await findOwnedDevice(req, { id: req.params.id });
    if (!dev) {
      res.status(404).json({ success: false, error: { message: 'Device not found.' } });
      return;
    }

    const type = String(req.body?.type || 'SYNC_ATTLOG').toUpperCase();
    const isDate = (v: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    let command: string;
    switch (type) {
      case 'SYNC_ATTLOG': {
        const to = isDate(req.body?.to) ? req.body.to : new Date().toISOString().slice(0, 10);
        const fromDefault = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10);
        const from = isDate(req.body?.from) ? req.body.from : fromDefault;
        command = `DATA QUERY ATTLOG StartTime=${from} 00:00:00\tEndTime=${to} 23:59:59`;
        break;
      }
      case 'SYNC_USERS':
        command = 'DATA QUERY USERINFO';
        break;
      case 'INFO':
        command = 'INFO';
        break;
      case 'REBOOT':
        command = 'REBOOT';
        break;
      default:
        res.status(400).json({ success: false, error: { message: 'Unknown command type.' } });
        return;
    }

    const [result]: any = await pool.query(
      'INSERT INTO biometric_device_commands (device_sn, command, created_by) VALUES (?, ?, ?)',
      [dev.device_sn, command, req.user?.id || null]
    );
    res.json({ success: true, message: 'Command queued. The device will execute it on its next heartbeat.', data: { id: result.insertId, command } });
  } catch (err: any) {
    logger.error('queueDeviceCommand error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to queue command.' } });
  }
}

/**
 * POST /api/v1/zkteco/reprocess – re-run PIN matching for unmatched punches of the company.
 */
export async function reprocessPunches(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBiometricSchema();
    const fixed = await reprocessUnmatched(pool, getTenantId(req));
    res.json({ success: true, message: `${fixed} previously unmatched punch(es) were applied to attendance.` });
  } catch (err: any) {
    logger.error('reprocessPunches error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to reprocess punches.' } });
  }
}

/**
 * POST /api/v1/zkteco/simulate-punch  { employeeId, deviceSn?, verifyType? }
 * Test helper: records a punch for an HRMS employee code at the current server time.
 */
export async function simulateBiometricPunch(req: AuthRequest, res: Response): Promise<void> {
  const { employeeId, deviceSn, verifyType } = req.body || {};
  if (!employeeId) {
    res.status(400).json({ success: false, error: { message: 'Employee ID is required.' } });
    return;
  }

  try {
    await ensureBiometricSchema();
    const companyId = getTenantId(req);
    const [users]: any = await pool.query(
      'SELECT id, employee_id FROM users WHERE company_id = ? AND (employee_id = ? OR biometric_pin = ?) LIMIT 1',
      [companyId, employeeId, employeeId]
    );
    if (users.length === 0) {
      res.status(404).json({ success: false, error: { message: `No employee with code ${employeeId} in your company.` } });
      return;
    }

    const [nowRows]: any = await pool.query("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') as now");
    const now = nowRows[0].now as string;
    const sn = String(deviceSn || 'SIMULATOR').slice(0, 100);
    await pool.query(
      `INSERT INTO biometric_punch_logs (id, device_sn, company_id, employee_id, user_id, punch_time, verify_type, punch_state, raw_payload, processed)
       VALUES (?, ?, ?, ?, ?, ?, ?, '0', 'Simulated punch from HRMS UI', 1)`,
      [uuidv4(), sn, companyId, users[0].employee_id, users[0].id, now, String(verifyType || 'Face').slice(0, 50)]
    );
    await recomputeAttendanceDay(pool, users[0].id, companyId, now.slice(0, 10));

    res.json({ success: true, message: `Test punch recorded for ${users[0].employee_id} at ${now}. Attendance updated.` });
  } catch (err: any) {
    logger.error('simulateBiometricPunch error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to record test punch.' } });
  }
}

/**
 * GET /api/v1/zkteco/server-info
 * The address the terminal must be configured with ("Cloud Server Setting" on the device).
 * Override with ADMS_PUBLIC_HOST / ADMS_PUBLIC_PORT / ADMS_PUBLIC_HTTPS when behind a proxy.
 */
export function getServerInfo(req: AuthRequest, res: Response): void {
  const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME;
  const host = process.env.ADMS_PUBLIC_HOST || renderHost || req.hostname;
  const https = process.env.ADMS_PUBLIC_HTTPS
    ? ['1', 'true', 'yes'].includes(process.env.ADMS_PUBLIC_HTTPS.toLowerCase())
    : Boolean(renderHost) || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const port = Number(process.env.ADMS_PUBLIC_PORT) || (https ? 443 : Number(process.env.PORT) || 4000);
  res.json({
    success: true,
    data: {
      host,
      port,
      https,
      isDomain: !/^\d{1,3}(\.\d{1,3}){3}$/.test(host),
      handshakeUrl: `${https ? 'https' : 'http'}://${host}${[80, 443].includes(port) ? '' : `:${port}`}/iclock/cdata`,
    },
  });
}

/**
 * POST /api/v1/zkteco/test-connection { ipAddress, port }
 * Opens a TCP connection from the HRMS server to the device. Only meaningful when the server
 * runs inside the same network as the device (a cloud server cannot reach private 192.168.x.x IPs).
 */
export async function testDeviceConnection(req: AuthRequest, res: Response): Promise<void> {
  const { ipAddress, port = 4370 } = req.body || {};
  if (!ipAddress || !/^[A-Za-z0-9.:-]{3,100}$/.test(String(ipAddress))) {
    res.status(400).json({ success: false, error: { message: 'A valid device IP address is required.' } });
    return;
  }

  const targetPort = parseInt(String(port), 10) || 4370;
  const startTime = Date.now();
  const socket = new net.Socket();
  let handled = false;

  const finish = (ok: boolean, message: string) => {
    if (handled) return;
    handled = true;
    clearTimeout(timer);
    socket.destroy();
    res.json({ success: ok, status: ok ? 'ONLINE' : 'OFFLINE', latencyMs: ok ? Date.now() - startTime : undefined, message });
  };

  const timer = setTimeout(
    () => finish(false, `No response from ${ipAddress}:${targetPort} within 3s. If HRMS is hosted in the cloud this test cannot reach a private office IP – check the "Last heartbeat" column instead.`),
    3000
  );
  socket.connect(targetPort, String(ipAddress), () => finish(true, `Device at ${ipAddress}:${targetPort} accepted a TCP connection (${Date.now() - startTime}ms).`));
  socket.on('error', (err) => finish(false, `Could not connect to ${ipAddress}:${targetPort} (${err.message}).`));
}
