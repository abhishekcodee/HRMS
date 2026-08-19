import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * List Employees - Database Driven Single Source of Truth
 */
export async function listEmployees(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, department, status, role } = req.query;

    let query = `
      SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.phone,
             u.role, u.status, u.profile_photo as profilePhoto, u.last_login_at as lastLoginAt,
             u.created_at as createdAt,
             ep.department_name as departmentName, ep.designation, ep.branch_name as branchName,
             ep.shift_name as shiftName, ep.employment_type as employmentType, ep.joining_date as joiningDate,
             ep.salary, ep.gender, ep.dob, ep.address, ep.emergency_contact as emergencyContact,
             ep.emergency_phone as emergencyPhone, ep.manager_id as managerId, ep.manager_name as managerName
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(u.employee_id) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))`;
      const searchPattern = `%${String(search).trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (department) {
      query += ` AND ep.department_name = ?`;
      params.push(String(department).trim());
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(String(status).trim().toLowerCase());
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(String(role).trim().toLowerCase());
    }

    query += ` ORDER BY u.created_at DESC`;

    const [rows]: any = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('List Employees Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee directory from database.' } });
  }
}

/**
 * Get Employee By ID - Database Single Source of Truth
 */
export async function getEmployeeById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.phone,
              u.role, u.status, u.profile_photo as profilePhoto, u.last_login_at as lastLoginAt,
              u.created_at as createdAt,
              ep.department_name as departmentName, ep.designation, ep.branch_name as branchName,
              ep.shift_name as shiftName, ep.employment_type as employmentType, ep.joining_date as joiningDate,
              ep.salary, ep.gender, ep.dob, ep.address, ep.emergency_contact as emergencyContact,
              ep.emergency_phone as emergencyPhone, ep.manager_id as managerId, ep.manager_name as managerName
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ? OR u.employee_id = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee record not found in database.' } });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee profile.' } });
  }
}

/**
 * Create Employee - Insert directly into MySQL Database
 */
export async function createEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      fullName,
      email,
      phone,
      password,
      role,
      status,
      departmentName,
      designation,
      branchName,
      shiftName,
      employmentType,
      joiningDate,
      salary,
      gender,
      dob,
      address,
      emergencyContact,
      emergencyPhone,
      managerId,
      managerName,
    } = req.body;

    if (!employeeId || !fullName || !email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Employee ID, Full Name, Email, and Password are required.' },
      });
      return;
    }

    const trimmedEmpId = employeeId.trim();
    const trimmedEmail = email.trim();

    // Check duplicate
    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(employee_id) = LOWER(?)',
      [trimmedEmail, trimmedEmpId]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'An employee with this Email or Employee ID already exists in the database.' },
      });
      return;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || 'employee';
    const userStatus = status || 'active';

    // Insert user
    await pool.query(
      `INSERT INTO users (id, employee_id, full_name, email, phone, password_hash, role, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, trimmedEmpId, fullName.trim(), trimmedEmail, phone ? phone.trim() : null, passwordHash, userRole, userStatus]
    );

    // Insert profile
    const profileId = uuidv4();
    await pool.query(
      `INSERT INTO employee_profiles (
        id, user_id, department_name, designation, branch_name, shift_name, employment_type,
        joining_date, salary, gender, dob, address, emergency_contact, emergency_phone, manager_id, manager_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        userId,
        departmentName || 'General',
        designation || 'Employee',
        branchName || 'Corporate HQ',
        shiftName || 'General Day Shift',
        employmentType || 'Full-Time',
        joiningDate || new Date().toISOString().split('T')[0],
        salary || 50000.00,
        gender || 'Other',
        dob || null,
        address || null,
        emergencyContact || null,
        emergencyPhone || null,
        managerId || null,
        managerName || null,
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        req.user?.id || null,
        req.user?.email || 'admin@hrms.com',
        req.user?.role || 'admin',
        'EMPLOYEE_CREATED',
        `Created employee record for ${fullName} (${trimmedEmpId}) in MySQL database`,
        req.ip || '127.0.0.1',
      ]
    );

    res.status(201).json({
      success: true,
      message: `Employee ${fullName} created successfully in database.`,
      data: {
        id: userId,
        employeeId: trimmedEmpId,
        fullName,
        email: trimmedEmail,
        role: userRole,
        status: userStatus,
        departmentName,
        designation,
      },
    });
  } catch (error) {
    console.error('Create Employee Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create employee record in database.' } });
  }
}

/**
 * Update Employee - Mutate directly in MySQL Database
 */
export async function updateEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      phone,
      profilePhoto,
      role,
      status,
      departmentName,
      designation,
      branchName,
      shiftName,
      employmentType,
      joiningDate,
      salary,
      gender,
      dob,
      address,
      emergencyContact,
      emergencyPhone,
      managerId,
      managerName,
    } = req.body;

    const [users]: any = await pool.query('SELECT id, employee_id, full_name, email FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found in database.' } });
      return;
    }

    const currentUser = users[0];

    // Update Users Table
    await pool.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           profile_photo = COALESCE(?, profile_photo),
           role = COALESCE(?, role),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`,
      [
        fullName ? fullName.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        profilePhoto ? profilePhoto.trim() : null,
        role || null,
        status || null,
        id,
      ]
    );

    // Check if employee profile exists, else create
    const [profiles]: any = await pool.query('SELECT id FROM employee_profiles WHERE user_id = ?', [id]);
    if (profiles.length === 0) {
      await pool.query(
        `INSERT INTO employee_profiles (
          id, user_id, department_name, designation, branch_name, shift_name, employment_type,
          joining_date, salary, gender, dob, address, emergency_contact, emergency_phone, manager_id, manager_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), id, departmentName || null, designation || null, branchName || null, shiftName || null,
          employmentType || null, joiningDate || null, salary || null, gender || null, dob || null,
          address || null, emergencyContact || null, emergencyPhone || null, managerId || null, managerName || null,
        ]
      );
    } else {
      await pool.query(
        `UPDATE employee_profiles
         SET department_name = COALESCE(?, department_name),
             designation = COALESCE(?, designation),
             branch_name = COALESCE(?, branch_name),
             shift_name = COALESCE(?, shift_name),
             employment_type = COALESCE(?, employment_type),
             joining_date = COALESCE(?, joining_date),
             salary = COALESCE(?, salary),
             gender = COALESCE(?, gender),
             dob = COALESCE(?, dob),
             address = COALESCE(?, address),
             emergency_contact = COALESCE(?, emergency_contact),
             emergency_phone = COALESCE(?, emergency_phone),
             manager_id = COALESCE(?, manager_id),
             manager_name = COALESCE(?, manager_name)
         WHERE user_id = ?`,
        [
          departmentName || null, designation || null, branchName || null, shiftName || null,
          employmentType || null, joiningDate || null, salary || null, gender || null, dob || null,
          address || null, emergencyContact || null, emergencyPhone || null, managerId || null, managerName || null, id,
        ]
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
        'EMPLOYEE_UPDATED',
        `Updated database record for employee ${currentUser.full_name} (${currentUser.employee_id})`,
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: `Employee record for ${fullName || currentUser.full_name} updated successfully.`,
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update employee record.' } });
  }
}

/**
 * Update Employee Status (Active / Inactive Deactivation Soft Delete)
 */
export async function updateEmployeeStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['active', 'inactive', 'suspended'];
    if (!allowed.includes(String(status).toLowerCase())) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Status must be active, inactive, or suspended.' } });
      return;
    }

    const [users]: any = await pool.query('SELECT id, employee_id, full_name, email FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } });
      return;
    }

    const user = users[0];
    const newStatus = String(status).toLowerCase();

    await pool.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, user_email, role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        req.user?.id || null,
        req.user?.email || 'admin@hrms.com',
        req.user?.role || 'admin',
        'EMPLOYEE_STATUS_UPDATED',
        `Updated database status for ${user.full_name} (${user.employee_id}) to ${newStatus.toUpperCase()}`,
        req.ip || '127.0.0.1',
      ]
    );

    res.json({
      success: true,
      message: `Employee status changed to ${newStatus.toUpperCase()}. Historical records preserved.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update employee status.' } });
  }
}
