import { Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/index.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { logSecurityEvent, extractReqSecurityContext } from './securityAuditLogger.js';

export interface StepUpAuthToken {
  token: string;
  userId: string;
  action: string;
  expiresAt: number;
}

const activeStepUpTokens = new Map<string, StepUpAuthToken>();

/**
 * Generate a random base32 TOTP secret string.
 */
export function generateTotpSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const randomBytes = crypto.randomBytes(20);
  for (let i = 0; i < randomBytes.length; i++) {
    secret += chars[randomBytes[i] % chars.length];
  }
  return secret;
}

/**
 * Generate 8 single-use backup recovery codes.
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

/**
 * Verify a 6-digit TOTP pin or backup code against user MFA secret.
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits) — compatible with Google/Microsoft Authenticator. */
export function generateTotpPin(secret: string, timeStep = Math.floor(Date.now() / 1000 / 30)): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

export function verifyTotpPin(secret: string, pin: string): boolean {
  if (!secret || !/^\d{6}$/.test(String(pin || ''))) return false;
  const epoch = Math.floor(Date.now() / 1000 / 30);
  // Accept the previous, current and next 30-second window to allow for clock drift
  for (let i = -1; i <= 1; i++) {
    const expected = Buffer.from(generateTotpPin(secret, epoch + i));
    if (crypto.timingSafeEqual(expected, Buffer.from(String(pin)))) return true;
  }
  return false;
}

/**
 * Issue a temporary (5 min) Step-Up Authentication Token for sensitive operations.
 */
export function issueStepUpToken(userId: string, action: string): string {
  const token = uuidv4();
  activeStepUpTokens.set(token, {
    token,
    userId,
    action,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  return token;
}

/**
 * Verify a Step-Up Token before processing sensitive action.
 */
export function verifyStepUpToken(token: string, userId: string, action: string): boolean {
  if (!token) return false;
  const record = activeStepUpTokens.get(token);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    activeStepUpTokens.delete(token);
    return false;
  }
  if (record.userId !== userId || record.action !== action) {
    return false;
  }
  // Single-use token
  activeStepUpTokens.delete(token);
  return true;
}

// HTTP Controllers for MFA Management
export async function setupMfa(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    const secret = generateTotpSecret();
    const backupCodes = generateBackupCodes();
    const otpAuthUrl = `otpauth://totp/HRMS:${encodeURIComponent(req.user?.email || 'User')}?secret=${secret}&issuer=Enterprise%20HRMS`;

    await pool.query(
      `INSERT INTO user_mfa_credentials (id, user_id, mfa_enabled, mfa_method, totp_secret, backup_codes_json)
       VALUES (?, ?, 0, 'TOTP', ?, ?)
       ON DUPLICATE KEY UPDATE totp_secret = VALUES(totp_secret), backup_codes_json = VALUES(backup_codes_json)`,
      [uuidv4(), userId, secret, JSON.stringify(backupCodes)]
    );

    res.json({
      success: true,
      data: {
        secret,
        otpAuthUrl,
        backupCodes,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to initiate MFA setup.' } });
  }
}

export async function verifyAndEnableMfa(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { pin } = req.body;

    if (!pin) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '6-digit MFA PIN is required.' } });
      return;
    }

    const [rows]: any = await pool.query(`SELECT totp_secret FROM user_mfa_credentials WHERE user_id = ?`, [userId]);
    if (rows.length === 0 || !rows[0].totp_secret) {
      res.status(400).json({ success: false, error: { code: 'NO_MFA_SETUP', message: 'MFA setup has not been initiated.' } });
      return;
    }

    const isValid = verifyTotpPin(rows[0].totp_secret, pin);
    if (!isValid) {
      res.status(400).json({ success: false, error: { code: 'INVALID_PIN', message: 'Invalid 6-digit MFA PIN.' } });
      return;
    }

    await pool.query(`UPDATE user_mfa_credentials SET mfa_enabled = 1 WHERE user_id = ?`, [userId]);

    const ctx = extractReqSecurityContext(req);
    await logSecurityEvent({
      ...ctx,
      action: 'MFA_ENABLED',
      resourceType: 'MFA',
      resourceId: userId,
    });

    res.json({ success: true, message: 'Multi-Factor Authentication enabled successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to enable MFA.' } });
  }
}
