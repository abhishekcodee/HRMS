import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../database/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { seedDemoData } from './demoSeeder.js';

const DEMO_EMAIL = 'demo@wokhman.com';
const DEMO_COMPANY_ID = 'c2000000-0000-0000-0000-000000000001';

/**
 * Extracts and verifies signed Demo Access Grant token
 */
export function extractAndVerifyDemoGrant(req: Request): { authorized: boolean; email?: string } | null {
  const token =
    (req.headers['x-demo-access-token'] as string) ||
    (req.query.demo_access as string) ||
    (req.body?.demoAccessToken as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    if (decoded && (decoded.type === 'DEMO_ACCESS_GRANT' || decoded.authorized === true)) {
      return { authorized: true, email: decoded.email };
    }
  } catch (err) {
    return null;
  }
  return null;
}

/**
 * Verifies demo authorization token for front-end access check
 */
export async function verifyDemoAccess(req: Request, res: Response): Promise<void> {
  const grant = extractAndVerifyDemoGrant(req);
  if (!grant) {
    res.status(401).json({
      success: false,
      authorized: false,
      error: {
        code: 'UNAUTHORIZED_DEMO_ACCESS',
        message: 'Demo credentials and access are restricted. Please submit a demo request to explore.',
      },
    });
    return;
  }

  res.json({
    success: true,
    authorized: true,
    email: grant.email,
    message: 'Authorized demo visitor verified.',
  });
}

/**
 * Metadata for Authorized Demo visitors only
 */
export async function getDemoInfo(req: Request, res: Response) {
  try {
    const grant = extractAndVerifyDemoGrant(req);
    if (!grant) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_DEMO_ACCESS',
          message: 'Unauthorized access. Demo credentials are only visible to visitors who requested demo access.',
        },
      });
      return;
    }
    const [settings]: any = await pool.query(
      'SELECT is_enabled, inactivity_timeout_minutes, allow_reset, last_reset_at FROM demo_settings WHERE company_id = ?',
      [DEMO_COMPANY_ID]
    );

    const config = settings?.[0] || {
      is_enabled: 1,
      inactivity_timeout_minutes: 30,
      allow_reset: 1,
      last_reset_at: new Date(),
    };

    res.json({
      success: true,
      data: {
        isEnabled: Boolean(config.is_enabled),
        inactivityTimeoutMinutes: config.inactivity_timeout_minutes || 30,
        allowReset: Boolean(config.allow_reset),
        lastResetAt: config.last_reset_at,
        credentials: {
          email: DEMO_EMAIL,
          password: 'Demo@12345',
        },
        features: {
          allowed: [
            'Interactive HRMS Dashboard & Real-Time Stats',
            'Employee Directory & Employee Detail Profiles',
            'Biometric Attendance Logs & Daily Punches',
            'Leave Management, Balances & Leave Approvals',
            'Payroll Dashboard & Payslip Previews (Read-Only)',
            'Company Master Departments & Designations',
            'Company Calendar Events & Schedule Previews',
          ],
          restricted: [
            'Platform Super Admin Master Controls',
            'Company Settings & White-Label Customization',
            'Subscription Plan & Billing Modifications',
            'Live Bank Account Transfers & Payouts',
            'User Account Role & Permission Tampering',
            'Permanent Record Deletion',
          ],
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching demo info:', error);
    res.status(500).json({ success: false, message: 'Could not load demo configuration.' });
  }
}

/**
 * 1-Click Direct Demo Login
 * Issues a valid JWT for demo@wokhman.com directly, enabling instant exploration.
 */
export async function directDemoLogin(req: Request, res: Response) {
  try {
    const grant = extractAndVerifyDemoGrant(req);
    if (!grant) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_DEMO_ACCESS',
          message: 'Direct demo login requires an authorized demo access token from an approved demo request.',
        },
      });
    }

    const [users]: any = await pool.query(
      `SELECT u.*, c.name as company_name, c.code as company_code, c.logo_url, c.brand_color, c.status as company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = ? AND u.status = 'active'`,
      [DEMO_EMAIL]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Demo account is temporarily offline. Please contact administrator.',
      });
    }

    const user = users[0];

    const companyInfo = {
      id: user.company_id,
      name: user.company_name || 'Wokhman Demo Corp',
      code: user.company_code || 'DEMO_CORP',
      status: user.company_status || 'active',
      logo_url: user.logo_url || '/logo.png',
      brand_color: user.brand_color || '#4f46e5',
      custom_domain: null,
    };

    const tokenPayload = {
      id: user.id,
      companyId: user.company_id,
      isSuperAdmin: false,
      employeeId: user.employee_id,
      email: user.email,
      role: 'demo',
      mustChangePassword: false,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      success: true,
      message: 'Demo session authenticated successfully. Welcome to Wokhman Demo!',
      data: {
        token,
        user: {
          id: user.id,
          companyId: user.company_id,
          isSuperAdmin: false,
          company: companyInfo,
          employeeId: user.employee_id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: 'demo',
          status: user.status,
          profilePhoto: user.profile_photo || null,
          mustChangePassword: false,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error during direct demo login:', error);
    res.status(500).json({ success: false, message: 'Demo authentication failed.' });
  }
}

/**
 * Reset Demo Data
 * Re-seeds the isolated demo tenant records back to original clean demo state.
 */
export async function resetDemoData(req: Request, res: Response) {
  try {
    logger.info('Resetting demo tenant data...');
    await seedDemoData();
    await pool.query(
      'UPDATE demo_settings SET last_reset_at = NOW() WHERE company_id = ?',
      [DEMO_COMPANY_ID]
    );

    res.json({
      success: true,
      message: 'Demo environment has been completely reset to its original clean state!',
    });
  } catch (error: any) {
    logger.error('Error resetting demo data:', error);
    res.status(500).json({ success: false, message: 'Failed to reset demo data.' });
  }
}
