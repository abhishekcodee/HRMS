import { Request, Response } from 'express';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

/**
 * eSSL Biometric Machine Handshake GET Handler
 * Responds to machine ping GET /iclock/cdata.php?SN=XXXXX
 */
export async function cdataGET(req: Request, res: Response): Promise<void> {
  const sn = (req.query.SN || req.query.sn || 'ESSL-DEFAULT') as string;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  try {
    const conn = await pool.getConnection();
    try {
      const [existing]: any = await conn.query('SELECT id FROM biometric_devices WHERE device_sn = ?', [sn]);
      if (existing.length === 0) {
        await conn.query(
          `INSERT INTO biometric_devices (id, device_sn, device_name, ip_address, port, location, status, last_ping_at)
           VALUES (?, ?, ?, ?, 4370, 'Auto-Discovered eSSL Device', 'ONLINE', NOW())`,
          [uuidv4(), sn, `eSSL Device (${sn})`, ip]
        );
      } else {
        await conn.query(
          `UPDATE biometric_devices SET status = 'ONLINE', last_ping_at = NOW(), ip_address = ? WHERE device_sn = ?`,
          [ip, sn]
        );
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('Error handling eSSL device GET ping:', err);
  }

  // eSSL ADMS protocol expects plain text OK response
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
}

/**
 * eSSL Biometric Machine Real-Time Punch POST Handler
 * Receives attendance punches pushed by eSSL machine via POST /iclock/cdata.php
 */
export async function cdataPOST(req: Request, res: Response): Promise<void> {
  const sn = (req.query.SN || req.query.sn || req.body?.deviceSn || 'ESSL-X990-BLR-01') as string;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  logger.info(`Biometric eSSL Punch PUSH received from SN: ${sn}`);

  let processedCount = 0;

  try {
    const conn = await pool.getConnection();
    try {
      // Parse eSSL tab-separated or line-separated payload
      // Standard format: <emp_id>\t<timestamp>\t<state>\t<verify_mode>
      const lines = rawBody.split(/\r?\n/).filter(line => line.trim().length > 0);

      for (const line of lines) {
        let empCode = '';
        let punchTimeStr = '';
        let punchState = '0';
        let verifyType = 'Fingerprint';

        if (line.includes('\t') || line.includes(' ')) {
          const parts = line.trim().split(/[\t\s]+/);
          if (parts.length >= 2) {
            empCode = parts[0];
            punchTimeStr = parts[1] + (parts[2] ? ` ${parts[2]}` : '');
            if (parts.length >= 4) punchState = parts[3];
          }
        } else if (typeof req.body === 'object' && req.body.employeeId) {
          empCode = req.body.employeeId;
          punchTimeStr = req.body.punchTime || new Date().toISOString().replace('T', ' ').substring(0, 19);
          punchState = req.body.punchState || '0';
          verifyType = req.body.verifyType || 'Fingerprint';
        }

        if (!empCode) continue;

        const punchTime = new Date(punchTimeStr || Date.now());
        const validTime = isNaN(punchTime.getTime()) ? new Date() : punchTime;
        const formattedPunchTime = validTime.toISOString().slice(0, 19).replace('T', ' ');

        // Save raw punch log
        await conn.query(
          `INSERT INTO biometric_punch_logs (id, device_sn, employee_id, punch_time, verify_type, punch_state, raw_payload, processed)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [uuidv4(), sn, empCode, formattedPunchTime, verifyType, punchState, line]
        );

        // Process Attendance in MySQL
        await processAutoAttendance(conn, empCode, validTime);
        processedCount++;
      }

      // Update Device Last Ping
      await conn.query(
        `UPDATE biometric_devices SET status = 'ONLINE', last_ping_at = NOW() WHERE device_sn = ?`,
        [sn]
      );
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('Error processing eSSL biometric punch payload:', err);
  }

  // eSSL ADMS protocol expects 'OK' or 'OK: <count>'
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(`OK: ${processedCount}`);
}

/**
 * Helper to Auto-Calculate Daily Attendance from Biometric Punches
 */
async function processAutoAttendance(conn: any, employeeId: string, punchDate: Date) {
  try {
    // 1. Find User by employee_id (e.g. 'EMP001')
    const [userRows]: any = await conn.query('SELECT id, full_name FROM users WHERE employee_id = ?', [employeeId]);
    if (userRows.length === 0) return;

    const userId = userRows[0].id;
    const workDate = punchDate.toISOString().split('T')[0]; // '2026-08-13'

    // 2. Fetch all punches for this user on this workDate
    const [punches]: any = await conn.query(
      `SELECT punch_time FROM biometric_punch_logs 
       WHERE employee_id = ? AND DATE(punch_time) = ? 
       ORDER BY punch_time ASC`,
      [employeeId, workDate]
    );

    if (punches.length === 0) return;

    const firstPunch = new Date(punches[0].punch_time);
    const lastPunch = new Date(punches[punches.length - 1].punch_time);

    const clockInStr = firstPunch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    let clockOutStr: string | null = null;
    let workHours = 0;

    if (punches.length > 1 && lastPunch.getTime() > firstPunch.getTime()) {
      clockOutStr = lastPunch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const diffMs = lastPunch.getTime() - firstPunch.getTime();
      workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }

    // Determine status (Shift start 09:00 AM)
    const hour = firstPunch.getHours();
    const min = firstPunch.getMinutes();
    let status = 'PRESENT';
    if (hour > 9 || (hour === 9 && min > 15)) {
      status = 'LATE';
    }

    // 3. Upsert into attendance table
    const [existingAtt]: any = await conn.query(
      'SELECT id FROM attendance WHERE user_id = ? AND work_date = ?',
      [userId, workDate]
    );

    if (existingAtt.length === 0) {
      await conn.query(
        `INSERT INTO attendance (id, user_id, work_date, clock_in, clock_out, work_hours, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'eSSL Biometric Auto-Punch')`,
        [uuidv4(), userId, workDate, clockInStr, clockOutStr, workHours, status]
      );
    } else {
      await conn.query(
        `UPDATE attendance SET clock_in = ?, clock_out = ?, work_hours = ?, status = ?, notes = 'eSSL Biometric Live Sync'
         WHERE id = ?`,
        [clockInStr, clockOutStr, workHours, status, existingAtt[0].id]
      );
    }
  } catch (err) {
    logger.error(`Error auto processing attendance for ${employeeId}:`, err);
  }
}

/**
 * GET /api/v1/zkteco/devices
 * List all configured eSSL Biometric Machines with real dynamic heartbeat status
 */
export async function getBiometricDevices(req: Request, res: Response): Promise<void> {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.query(
        `SELECT id, device_sn as deviceSn, device_name as deviceName, ip_address as ipAddress, port, location, 
                last_ping_at as lastPingAt, created_at as createdAt,
                CASE 
                  WHEN last_ping_at IS NOT NULL AND TIMESTAMPDIFF(SECOND, last_ping_at, NOW()) <= 180 THEN 'ONLINE'
                  ELSE 'OFFLINE'
                END as dynamicStatus
         FROM biometric_devices ORDER BY created_at DESC`
      );

      const formatted = rows.map((row: any) => ({
        ...row,
        status: row.dynamicStatus,
      }));

      res.json({ success: true, data: formatted });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * POST /api/v1/zkteco/devices
 * Register new eSSL Biometric Device
 */
export async function registerBiometricDevice(req: Request, res: Response): Promise<void> {
  const { deviceSn, deviceName, ipAddress, port, location } = req.body;

  if (!deviceSn || !deviceName) {
    res.status(400).json({ success: false, error: { message: 'Device Serial Number and Name are required.' } });
    return;
  }

  try {
    const conn = await pool.getConnection();
    try {
      const id = uuidv4();
      await conn.query(
        `INSERT INTO biometric_devices (id, device_sn, device_name, ip_address, port, location, status, last_ping_at)
         VALUES (?, ?, ?, ?, ?, ?, 'OFFLINE', NULL)`,
        [id, deviceSn, deviceName, ipAddress || '192.168.1.100', port || 4370, location || 'Office Gate']
      );

      res.json({ success: true, message: 'eSSL Biometric Device registered. Status will show ONLINE as soon as machine pings server.', data: { id, deviceSn, deviceName } });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * DELETE /api/v1/zkteco/devices/:id
 * Remove a registered biometric device
 */
export async function deleteBiometricDevice(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM biometric_devices WHERE id = ?', [id]);
      res.json({ success: true, message: 'Biometric device removed successfully.' });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * GET /api/v1/zkteco/raw-logs
 * Fetch recent eSSL raw biometric punch logs
 */
export async function getRawBiometricLogs(req: Request, res: Response): Promise<void> {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.query(
        `SELECT l.id, l.device_sn as deviceSn, l.employee_id as employeeId, u.full_name as employeeName, 
                l.punch_time as punchTime, l.verify_type as verifyType, l.punch_state as punchState, l.created_at as createdAt
         FROM biometric_punch_logs l
         LEFT JOIN users u ON l.employee_id = u.employee_id
         ORDER BY l.punch_time DESC LIMIT 100`
      );
      res.json({ success: true, data: rows });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * POST /api/v1/zkteco/simulate-punch
 * Dev / UI test endpoint to simulate an eSSL fingerprint scan
 */
export async function simulateBiometricPunch(req: Request, res: Response): Promise<void> {
  const { employeeId, deviceSn, verifyType } = req.body;

  if (!employeeId) {
    res.status(400).json({ success: false, error: { message: 'Employee ID is required.' } });
    return;
  }

  const sn = deviceSn || 'ESSL-X990-BLR-01';
  const vType = verifyType || 'Fingerprint';
  const now = new Date();
  const formattedTime = now.toISOString().slice(0, 19).replace('T', ' ');

  try {
    const conn = await pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO biometric_punch_logs (id, device_sn, employee_id, punch_time, verify_type, punch_state, raw_payload, processed)
         VALUES (?, ?, ?, ?, ?, '0', 'Simulated eSSL Fingerprint Punch', 1)`,
        [uuidv4(), sn, employeeId, formattedTime, vType]
      );

      await processAutoAttendance(conn, employeeId, now);

      res.json({
        success: true,
        message: `Biometric punch logged for ${employeeId} via eSSL machine (${sn}). Attendance automatically updated in MySQL!`,
      });
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * Real TCP Socket Hardware Connection Test (Port 4370)
 * Attempts direct TCP socket connection to physical eSSL / ZKTeco machine IP
 */
export async function testDeviceConnection(req: Request, res: Response): Promise<void> {
  const { ipAddress, port = 4370, deviceSn } = req.body;

  if (!ipAddress) {
    res.status(400).json({ success: false, error: { message: 'Device IP Address is required for socket testing.' } });
    return;
  }

  const targetPort = parseInt(String(port), 10) || 4370;
  const startTime = Date.now();

  const socket = new net.Socket();
  let handled = false;

  const timer = setTimeout(async () => {
    if (!handled) {
      handled = true;
      socket.destroy();

      if (deviceSn) {
        try {
          await pool.query("UPDATE biometric_devices SET status = 'OFFLINE' WHERE device_sn = ?", [deviceSn]);
        } catch (_) {}
      }

      res.json({
        success: false,
        status: 'OFFLINE',
        message: `Connection timed out to physical device at ${ipAddress}:${targetPort}. Verify machine power, network cable/WiFi, and local subnet routing.`,
      });
    }
  }, 3000);

  socket.connect(targetPort, ipAddress, async () => {
    if (!handled) {
      handled = true;
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;
      socket.end();

      if (deviceSn) {
        try {
          await pool.query("UPDATE biometric_devices SET status = 'ONLINE', last_ping_at = NOW() WHERE device_sn = ?", [deviceSn]);
        } catch (_) {}
      }

      res.json({
        success: true,
        status: 'ONLINE',
        latencyMs,
        message: `Physical eSSL / ZKTeco machine at ${ipAddress}:${targetPort} responded successfully via TCP port 4370 (${latencyMs}ms latency)!`,
      });
    }
  });

  socket.on('error', async (err) => {
    if (!handled) {
      handled = true;
      clearTimeout(timer);
      socket.destroy();

      if (deviceSn) {
        try {
          await pool.query("UPDATE biometric_devices SET status = 'OFFLINE' WHERE device_sn = ?", [deviceSn]);
        } catch (_) {}
      }

      res.json({
        success: false,
        status: 'OFFLINE',
        message: `Could not connect to physical device at ${ipAddress}:${targetPort} (${err.message}). Ensure port 4370 is open on machine and firewall.`,
      });
    }
  });
}
