import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const rawIdentifier = req.body.identifier || req.body.email || req.body.username || req.body.employeeId || '';
    const password = req.body.password;

    if (!rawIdentifier || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide Email/Employee ID and Password.',
        },
      });
      return;
    }

    const trimmedIdentifier = rawIdentifier.trim();

    const [rows]: any = await pool.query(
      `SELECT id, company_id, employee_id, full_name, email, phone, password_hash, role, status, profile_photo, must_change_password
       FROM users
       WHERE LOWER(email) = LOWER(?) OR LOWER(employee_id) = LOWER(?)`,
      [trimmedIdentifier, trimmedIdentifier]
    );

    if (rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid Email/Employee ID or password.',
        },
      });
      return;
    }

    const user = rows[0];

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: `Account is ${user.status.toUpperCase()}. Please contact System Administrator.`,
        },
      });
      return;
    }

    // Check company status if user is tied to a company
    let companyInfo: any = null;
    if (user.company_id) {
      const [cRows]: any = await pool.query(
        'SELECT id, name, code, status, logo_url, brand_color, custom_domain FROM companies WHERE id = ?',
        [user.company_id]
      );
      if (cRows.length > 0) {
        companyInfo = cRows[0];
        if (companyInfo.status === 'suspended' || companyInfo.status === 'inactive') {
          res.status(403).json({
            success: false,
            error: {
              code: 'COMPANY_SUSPENDED',
              message: `Your company (${companyInfo.name}) subscription is currently ${companyInfo.status.toUpperCase()}. Please contact Platform Support.`,
            },
          });
          return;
        }
      }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await pool.query(
        `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          user.company_id || null,
          user.id,
          user.email,
          user.role,
          'LOGIN_FAILED',
          'Invalid password attempt',
          req.ip || '127.0.0.1',
        ]
      );

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid Email/Employee ID or password.',
        },
      });
      return;
    }

    // Update last_login_at in MySQL
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const mustChangePassword = user.must_change_password === 1 || user.must_change_password === true;
    const isSuperAdmin = user.role === 'super_admin';

    // Record audit log
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        user.company_id || null,
        user.id,
        user.email,
        user.role,
        'LOGIN_SUCCESS',
        `User logged in successfully as ${user.role} (mustChangePassword: ${mustChangePassword})`,
        req.ip || '127.0.0.1',
      ]
    );

    // Sign JWT token with strict 30-minute limit for demo users
    const isDemo = user.role === 'demo' || user.email?.toLowerCase().includes('demo');
    const demoExpiresAt = isDemo ? Date.now() + 30 * 60 * 1000 : undefined;
    const tokenPayload = {
      id: user.id,
      companyId: user.company_id || null,
      isSuperAdmin,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role,
      demoExpiresAt,
      mustChangePassword,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: isDemo ? '30m' : '1d' });

    res.json({
      success: true,
      data: {
        token,
        demoExpiresAt,
        user: {
          id: user.id,
          companyId: user.company_id || null,
          isSuperAdmin,
          company: companyInfo,
          employeeId: user.employee_id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          profilePhoto: user.profile_photo,
          mustChangePassword,
        },
      },
    });
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An internal error occurred during authentication.',
      },
    });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Current Password, New Password, and Confirm Password are required.' },
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password and confirm password do not match.' },
      });
      return;
    }

    // Password Policy Regex:
    // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long and contain an uppercase letter, lowercase letter, number, and special character (@$!%*?&).',
        },
      });
      return;
    }

    // Retrieve stored user hash & status
    const [rows]: any = await pool.query(
      'SELECT id, employee_id, full_name, email, role, status, password_hash, must_change_password FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    const user = rows[0];

    // Verify current password
    const isCurrentMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentMatch) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password provided is incorrect.' },
      });
      return;
    }

    // New password cannot be equal to current password
    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        error: { code: 'SAME_PASSWORD', message: 'New password cannot be identical to your temporary/current password.' },
      });
      return;
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update user record: password_hash, must_change_password = 0, password_changed_at = NOW()
    await pool.query(
      `UPDATE users
       SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [newHash, userId]
    );

    // Record audit log
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        user.id,
        user.email,
        user.role,
        user.must_change_password ? 'FIRST_TIME_PASSWORD_CHANGED' : 'PASSWORD_CHANGED',
        'User successfully updated account password',
        req.ip || '127.0.0.1',
      ]
    );

    // Reissue fresh JWT token with mustChangePassword = false
    const tokenPayload = {
      id: user.id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      success: true,
      message: 'Password updated successfully! You can now access your HRMS portal.',
      data: {
        token,
        user: {
          id: user.id,
          employeeId: user.employee_id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
          mustChangePassword: false,
        },
      },
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update password.' } });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email address is required.' },
      });
      return;
    }

    const [rows]: any = await pool.query('SELECT id, email, full_name, role FROM users WHERE email = ?', [email.trim()]);

    if (rows.length === 0) {
      res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been generated.',
      });
      return;
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), user.id, tokenHash, expiresAt]
    );

    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        user.id,
        user.email,
        user.role,
        'PASSWORD_RESET_REQUEST',
        'Password reset token generated',
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: 'Password reset request generated successfully.',
      debugResetToken: env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    console.error('Forgot Password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process password reset.' },
    });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid token and new password (min 8 chars) required.' },
      });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [rows]: any = await pool.query(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired password reset token.' },
      });
      return;
    }

    const resetRecord = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, resetRecord.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [resetRecord.id]);

    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), resetRecord.user_id, 'PASSWORD_RESET_SUCCESS', 'Password updated successfully via reset token', req.ip || '127.0.0.1']
    );

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset Password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reset password.' },
    });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    return;
  }

  res.json({
    success: true,
    data: req.user,
  });
}

export async function switchRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { targetRole } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    const allowedTargetRoles = ['admin', 'employer', 'employee'];
    if (!allowedTargetRoles.includes(targetRole)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid target role requested.' },
      });
      return;
    }

    if (currentUser.role === 'employee' && (targetRole === 'admin' || targetRole === 'employer')) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access Denied: Standard Employee accounts are not authorized to switch to Admin or Employer view.',
        },
      });
      return;
    }

    if (currentUser.role === 'employer' && targetRole === 'admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access Denied: Employer accounts are not authorized to switch to Admin view.',
        },
      });
      return;
    }

    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        currentUser.id,
        currentUser.email,
        currentUser.role,
        'ROLE_VIEW_SWITCH',
        `Switched view perspective from ${currentUser.role} to ${targetRole}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: `Switched view perspective to ${targetRole.toUpperCase()}.`,
      data: {
        activeRoleView: targetRole,
      },
    });
  } catch (error) {
    console.error('Switch Role error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to switch role view.' },
    });
  }
}
