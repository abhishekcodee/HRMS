import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { getMailFrom, getSmtpTransporter, isEmailConfigured } from '../../services/emailService.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Where the web app lives: FRONTEND_URL, else the browser origin that made the request. */
export function frontendBase(req?: Request): string {
  const env = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const origin = String(req?.headers?.origin || '').trim();
  if (/^https?:\/\/[^\s/]+$/.test(origin)) return origin;
  return 'http://localhost:8080';
}

/**
 * Create a one-time password link and e-mail it.
 * WELCOME links (new employees) last 72 hours, RESET links 1 hour. Earlier unused links are invalidated.
 */
export async function sendPasswordLink(
  userId: string,
  purpose: 'WELCOME' | 'RESET',
  req?: Request
): Promise<{ sent: boolean; reason?: string }> {
  const [users]: any = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.employee_id, c.name AS company FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = ?`,
    [userId]
  );
  const u = users[0];
  if (!u?.email) return { sent: false, reason: 'No e-mail address' };

  await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [userId]);
  const token = crypto.randomBytes(32).toString('hex');
  const hours = purpose === 'WELCOME' ? 72 : 1;
  await pool.query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [uuidv4(), userId, crypto.createHash('sha256').update(token).digest('hex'), new Date(Date.now() + hours * 3600 * 1000)]
  );
  const link = `${frontendBase(req)}/reset-password?token=${token}${purpose === 'WELCOME' ? '&welcome=1' : ''}`;
  const company = u.company || 'your company';
  const subject = purpose === 'WELCOME' ? `Welcome to ${company} – set up your HR account` : 'Reset your HR portal password';
  const intro = purpose === 'WELCOME'
    ? `${esc(company)} has created your HR account. Use it to see your attendance, apply for leave and download payslips.`
    : 'We received a request to reset your password. If it was not you, ignore this e-mail.';
  const html = `<!doctype html><html><body style="margin:0;padding:16px;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px">${purpose === 'WELCOME' ? 'Welcome' : 'Password reset'}, ${esc(String(u.full_name || '').split(' ')[0])}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.5">${intro}</p>
    <table style="font-size:14px;color:#334155;margin:12px 0"><tr><td style="padding:2px 12px 2px 0;color:#64748b">Login ID</td><td><b>${esc(u.employee_id)}</b> or ${esc(u.email)}</td></tr></table>
    <p style="text-align:center;margin:24px 0"><a href="${esc(link)}" style="background:#4f46e5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${purpose === 'WELCOME' ? 'Set my password' : 'Choose a new password'}</a></p>
    <p style="color:#94a3b8;font-size:12px">This link works once and expires in ${hours === 1 ? '1 hour' : `${hours} hours`}.</p>
  </div></body></html>`;

  if (!isEmailConfigured()) {
    logger.warn(`E-mail not configured: ${purpose} link for ${u.email} was created but not sent`);
    return { sent: false, reason: 'E-mail is not configured on the server' };
  }
  try {
    await getSmtpTransporter().sendMail({ from: getMailFrom(), to: u.email, subject, html });
    return { sent: true };
  } catch (err: any) {
    logger.error(`Failed to send ${purpose} e-mail to ${u.email}: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}
