import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { checkCompanyEmployeeLimit } from '../../utils/employeeLimitGuard.js';

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      fullName,
      email,
      phone,
      password,
      role,
      status,
      profilePhoto,
      departmentName,
      designation,
      joiningDate,
      companyName,
      taxId,
    } = req.body;

    if (!employeeId || !fullName || !email || !password || !role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Employee ID, Full Name, Email, Password, and Role are required.',
        },
      });
      return;
    }

    const roleLower = String(role).toLowerCase();
    if (roleLower === 'admin' || roleLower === 'super_admin') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_CREATION_RESTRICTED',
          message: 'Security Policy: Exactly one Super Administrator account is authorized in this system. Additional administrator accounts cannot be created.',
        },
      });
      return;
    }

    const allowedRoles = ['employer', 'employee'];
    if (!allowedRoles.includes(roleLower)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role must be strictly one of: employer, employee.',
        },
      });
      return;
    }

    // Check duplicate email or employeeId
    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE email = ? OR employee_id = ?',
      [email.trim(), employeeId.trim()]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A user with this Email or Employee ID already exists.',
        },
      });
      return;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const userStatus = status || 'active';
    const targetCompanyId = req.body.companyId || getTenantId(req);

    if (userStatus === 'active') {
      const limitCheck = await checkCompanyEmployeeLimit(targetCompanyId, 1);
      if (!limitCheck.allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'EMPLOYEE_LIMIT_EXCEEDED',
            message: limitCheck.message,
            currentActive: limitCheck.currentActive,
            maxLimit: limitCheck.maxLimit,
          },
        });
        return;
      }
    }

    await pool.query(
      `INSERT INTO users (id, employee_id, full_name, email, phone, password_hash, role, status, profile_photo, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId,
        employeeId.trim(),
        fullName.trim(),
        email.trim(),
        phone ? phone.trim() : null,
        passwordHash,
        role,
        userStatus,
        profilePhoto || null,
      ]
    );

    if (role === 'employee') {
      await pool.query(
        `INSERT INTO employee_profiles (id, user_id, department_name, designation, joining_date)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), userId, departmentName || 'General', designation || 'Employee', joiningDate || new Date().toISOString().split('T')[0]]
      );
    } else if (role === 'employer') {
      await pool.query(
        `INSERT INTO employer_profiles (id, user_id, company_name, tax_id)
         VALUES (?, ?, ?, ?)`,
        [uuidv4(), userId, companyName || 'Enterprise HRMS Inc.', taxId || null]
      );
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        req.user?.id || null,
        req.user?.email || 'admin@hrms.com',
        req.user?.role || 'admin',
        'USER_CREATED',
        `Created new user ${fullName} (${role}) with ID ${employeeId}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(201).json({
      success: true,
      message: `User ${fullName} (${role.toUpperCase()}) created successfully.`,
      data: {
        id: userId,
        employeeId,
        fullName,
        email,
        role,
        status: userStatus,
      },
    });
  } catch (error) {
    console.error('Create User API error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create user in MySQL.' },
    });
  }
}

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.phone,
              u.role, u.status, u.profile_photo as profilePhoto, u.last_login_at as lastLoginAt,
              u.created_at as createdAt,
              ep.department_name as departmentName, ep.designation
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('List Users API error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch users list.' },
    });
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['active', 'inactive', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status must be active, inactive, or suspended.' },
      });
      return;
    }

    const [users]: any = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        req.user?.id,
        req.user?.email,
        req.user?.role,
        'USER_STATUS_UPDATED',
        `Changed account status for user ${users[0].email} to ${status.toUpperCase()}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: `User status updated to ${status.toUpperCase()}.`,
    });
  } catch (error) {
    console.error('Update User Status API error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update user status.' },
    });
  }
}

export async function adminResetUserPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = req.params.userId;
    const { temporaryPassword } = req.body;

    if (!targetUserId || !temporaryPassword || temporaryPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User ID and temporary password (min 8 chars) are required.' },
      });
      return;
    }

    const [users]: any = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = ?', [targetUserId]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target user not found.' } });
      return;
    }

    const targetUser = users[0];
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await pool.query(
      `UPDATE users SET password_hash = ?, must_change_password = 1, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [passwordHash, targetUserId]
    );

    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        req.user?.id,
        req.user?.email,
        req.user?.role,
        'ADMIN_RESET_USER_PASSWORD',
        `Admin ${req.user?.fullName} reset password for ${targetUser.full_name} (${targetUser.email}) and set must_change_password = true`,
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: `Temporary password set for ${targetUser.full_name}. The user will be forced to change it on their next login.`,
    });
  } catch (error) {
    console.error('Admin Reset User Password error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to reset user password.' } });
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, user_id as userId, user_email as userEmail, role, action, details, ip_address as ipAddress, created_at as createdAt
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get Audit Logs error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch audit logs.' } });
  }
}
