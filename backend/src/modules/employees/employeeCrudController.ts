import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Automatically insert custom department or designation into master tables if not existing
 */
async function ensureMasterDepartmentAndDesignation(departmentName?: string, designationName?: string): Promise<void> {
  if (departmentName && departmentName.trim()) {
    const trimmedDept = departmentName.trim();
    const [existingDept]: any = await pool.query('SELECT id FROM master_departments WHERE LOWER(name) = LOWER(?)', [trimmedDept]);
    if (existingDept.length === 0) {
      let code = trimmedDept.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);
      if (!code || code.length < 2) code = 'DEPT_' + Math.floor(100 + Math.random() * 900);
      
      const [existingCode]: any = await pool.query('SELECT id FROM master_departments WHERE code = ?', [code]);
      if (existingCode.length > 0) {
        code = `${code}_${Math.floor(10 + Math.random() * 90)}`;
      }

      await pool.query(
        'INSERT INTO master_departments (id, name, code, description) VALUES (?, ?, ?, ?)',
        [uuidv4(), trimmedDept, code, 'Custom department added during employee management']
      );
    }
  }

  if (designationName && designationName.trim()) {
    const trimmedDesig = designationName.trim();
    const [existingDesig]: any = await pool.query('SELECT id FROM master_designations WHERE LOWER(name) = LOWER(?)', [trimmedDesig]);
    if (existingDesig.length === 0) {
      let deptId: string | null = null;
      if (departmentName && departmentName.trim()) {
        const [depts]: any = await pool.query('SELECT id FROM master_departments WHERE LOWER(name) = LOWER(?)', [departmentName.trim()]);
        if (depts.length > 0) deptId = depts[0].id;
      }
      await pool.query(
        'INSERT INTO master_designations (id, name, department_id, department_name) VALUES (?, ?, ?, ?)',
        [uuidv4(), trimmedDesig, deptId, departmentName ? departmentName.trim() : null]
      );
    }
  }
}

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
             ep.confirmation_date as confirmationDate, ep.resignation_date as resignationDate,
             ep.last_working_date as lastWorkingDate, ep.experience_years as experienceYears,
             ep.salary, ep.gender, ep.dob, ep.address,
             ep.pan, ep.aadhaar, ep.uan, ep.pf_number as pfNumber, ep.esic_number as esicNumber,
             ep.bank_name as bankName, ep.account_number as accountNumber, ep.ifsc,
             ep.grade_id as gradeId, ep.cost_center_id as costCenterId,
             ep.residential_address as residentialAddress, ep.residential_city as residentialCity,
             ep.residential_state as residentialState, ep.residential_pincode as residentialPincode,
             ep.permanent_address as permanentAddress, ep.permanent_city as permanentCity,
             ep.permanent_state as permanentState, ep.permanent_pincode as permanentPincode,
             ep.permanent_address_same as permanentAddressSame,
             ep.emergency_contact as emergencyContact, ep.emergency_phone as emergencyPhone,
             ep.manager_id as managerId, ep.manager_name as managerName
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
              ep.confirmation_date as confirmationDate, ep.resignation_date as resignationDate,
              ep.last_working_date as lastWorkingDate, ep.experience_years as experienceYears,
              ep.salary, ep.gender, ep.dob, ep.address,
              ep.pan, ep.aadhaar, ep.uan, ep.pf_number as pfNumber, ep.esic_number as esicNumber,
              ep.bank_name as bankName, ep.account_number as accountNumber, ep.ifsc,
              ep.grade_id as gradeId, ep.cost_center_id as costCenterId,
              ep.residential_address as residentialAddress, ep.residential_city as residentialCity,
              ep.residential_state as residentialState, ep.residential_pincode as residentialPincode,
              ep.permanent_address as permanentAddress, ep.permanent_city as permanentCity,
              ep.permanent_state as permanentState, ep.permanent_pincode as permanentPincode,
              ep.permanent_address_same as permanentAddressSame,
              ep.emergency_contact as emergencyContact, ep.emergency_phone as emergencyPhone,
              ep.manager_id as managerId, ep.manager_name as managerName
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
 * Get Next Auto-Generated Employee ID (AMPL-00001 format)
 */
export async function getNextEmployeeId(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT employee_id as employeeId FROM users WHERE employee_id LIKE 'AMPL-%'`
    );

    let maxNum = 0;
    for (const r of rows) {
      const match = r.employeeId.match(/^AMPL-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    const nextEmployeeId = `AMPL-${String(nextNum).padStart(5, '0')}`;

    res.json({
      success: true,
      nextEmployeeId,
    });
  } catch (error) {
    console.error('Error generating next employee ID:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to generate next employee ID.' } });
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
      residentialAddress,
      residentialCity,
      residentialState,
      residentialPincode,
      permanentAddress,
      permanentCity,
      permanentState,
      permanentPincode,
      permanentAddressSame,
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

    const expNum = parseFloat(req.body.experienceYears);
    if (req.body.experienceYears !== undefined && req.body.experienceYears !== null && req.body.experienceYears !== '' && (isNaN(expNum) || expNum < 0)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Total Experience must be a valid non-negative number (e.g. 0, 3.5, 4, 5).' },
      });
      return;
    }
    const validExp = !isNaN(expNum) && expNum >= 0 ? expNum : 0.00;

    // Address fields calculation
    const isSame = Boolean(permanentAddressSame);
    const resAddr = residentialAddress ? residentialAddress.trim() : (address ? address.trim() : null);
    const resCity = residentialCity ? residentialCity.trim() : null;
    const resState = residentialState ? residentialState.trim() : null;
    const resPin = residentialPincode ? residentialPincode.trim() : null;

    const permAddr = isSame ? resAddr : (permanentAddress ? permanentAddress.trim() : null);
    const permCity = isSame ? resCity : (permanentCity ? permanentCity.trim() : null);
    const permState = isSame ? resState : (permanentState ? permanentState.trim() : null);
    const permPin = isSame ? resPin : (permanentPincode ? permanentPincode.trim() : null);
    const permSameVal = isSame ? 1 : 0;

    // Ensure Department & Designation exist in master tables
    await ensureMasterDepartmentAndDesignation(departmentName, designation);

    // Insert profile
    const profileId = uuidv4();
    await pool.query(
      `INSERT INTO employee_profiles (
        id, user_id, department_name, designation, branch_name, shift_name, employment_type,
        joining_date, experience_years, salary, gender, dob, address,
        residential_address, residential_city, residential_state, residential_pincode,
        permanent_address, permanent_city, permanent_state, permanent_pincode, permanent_address_same,
        emergency_contact, emergency_phone, manager_id, manager_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        userId,
        departmentName || 'General',
        designation || 'Employee',
        branchName || 'Corporate HQ',
        shiftName || 'General Day Shift',
        employmentType || 'Full-Time',
        joiningDate || new Date().toISOString().split('T')[0],
        validExp,
        salary || 50000.00,
        gender || 'Other',
        dob || null,
        resAddr,
        resAddr,
        resCity,
        resState,
        resPin,
        permAddr,
        permCity,
        permState,
        permPin,
        permSameVal,
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
      residentialAddress,
      residentialCity,
      residentialState,
      residentialPincode,
      permanentAddress,
      permanentCity,
      permanentState,
      permanentPincode,
      permanentAddressSame,
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

    const expNum = parseFloat(req.body.experienceYears);
    if (req.body.experienceYears !== undefined && req.body.experienceYears !== null && req.body.experienceYears !== '' && (isNaN(expNum) || expNum < 0)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Total Experience must be a valid non-negative number (e.g. 0, 3.5, 4, 5).' },
      });
      return;
    }
    const validExp = !isNaN(expNum) && expNum >= 0 ? expNum : null;

    const isSame = permanentAddressSame !== undefined ? Boolean(permanentAddressSame) : false;
    const resAddr = residentialAddress !== undefined ? (residentialAddress ? residentialAddress.trim() : null) : (address ? address.trim() : null);
    const resCity = residentialCity !== undefined ? (residentialCity ? residentialCity.trim() : null) : null;
    const resState = residentialState !== undefined ? (residentialState ? residentialState.trim() : null) : null;
    const resPin = residentialPincode !== undefined ? (residentialPincode ? residentialPincode.trim() : null) : null;

    const permAddr = isSame ? resAddr : (permanentAddress !== undefined ? (permanentAddress ? permanentAddress.trim() : null) : null);
    const permCity = isSame ? resCity : (permanentCity !== undefined ? (permanentCity ? permanentCity.trim() : null) : null);
    const permState = isSame ? resState : (permanentState !== undefined ? (permanentState ? permanentState.trim() : null) : null);
    const permPin = isSame ? resPin : (permanentPincode !== undefined ? (permanentPincode ? permanentPincode.trim() : null) : null);
    const permSameVal = isSame ? 1 : 0;

    // Ensure Department & Designation exist in master tables
    await ensureMasterDepartmentAndDesignation(departmentName, designation);

    // Check if employee profile exists, else create
    const [profiles]: any = await pool.query('SELECT id FROM employee_profiles WHERE user_id = ?', [id]);
    if (profiles.length === 0) {
      await pool.query(
        `INSERT INTO employee_profiles (
          id, user_id, department_name, designation, branch_name, shift_name, employment_type,
          joining_date, experience_years, salary, gender, dob, address,
          residential_address, residential_city, residential_state, residential_pincode,
          permanent_address, permanent_city, permanent_state, permanent_pincode, permanent_address_same,
          emergency_contact, emergency_phone, manager_id, manager_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), id, departmentName || null, designation || null, branchName || null, shiftName || null,
          employmentType || null, joiningDate || null, validExp ?? 0.00, salary || null, gender || null,
          dob || null, resAddr, resAddr, resCity, resState, resPin, permAddr, permCity, permState, permPin, permSameVal,
          emergencyContact || null, emergencyPhone || null, managerId || null, managerName || null,
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
             confirmation_date = COALESCE(?, confirmation_date),
             resignation_date = COALESCE(?, resignation_date),
             last_working_date = COALESCE(?, last_working_date),
             experience_years = COALESCE(?, experience_years),
             salary = COALESCE(?, salary),
             gender = COALESCE(?, gender),
             dob = COALESCE(?, dob),
             address = COALESCE(?, address),
             pan = COALESCE(?, pan),
             aadhaar = COALESCE(?, aadhaar),
             uan = COALESCE(?, uan),
             pf_number = COALESCE(?, pf_number),
             esic_number = COALESCE(?, esic_number),
             bank_name = COALESCE(?, bank_name),
             account_number = COALESCE(?, account_number),
             ifsc = COALESCE(?, ifsc),
             grade_id = COALESCE(?, grade_id),
             cost_center_id = COALESCE(?, cost_center_id),
             residential_address = COALESCE(?, residential_address),
             residential_city = COALESCE(?, residential_city),
             residential_state = COALESCE(?, residential_state),
             residential_pincode = COALESCE(?, residential_pincode),
             permanent_address = ?,
             permanent_city = ?,
             permanent_state = ?,
             permanent_pincode = ?,
             permanent_address_same = ?,
             emergency_contact = COALESCE(?, emergency_contact),
             emergency_phone = COALESCE(?, emergency_phone),
             manager_id = COALESCE(?, manager_id),
             manager_name = COALESCE(?, manager_name)
         WHERE user_id = ?`,
        [
          departmentName || null, designation || null, branchName || null, shiftName || null,
          employmentType || null, joiningDate || null, req.body.confirmationDate || null,
          req.body.resignationDate || null, req.body.lastWorkingDate || null,
          validExp, salary || null, gender || null,
          dob || null, resAddr || null, req.body.pan || null, req.body.aadhaar || null,
          req.body.uan || null, req.body.pfNumber || null, req.body.esicNumber || null,
          req.body.bankName || null, req.body.accountNumber || null, req.body.ifsc || null,
          req.body.gradeId || null, req.body.costCenterId || null,
          resAddr || null, resCity || null, resState || null, resPin || null,
          permAddr, permCity, permState, permPin, permSameVal,
          emergencyContact || null, emergencyPhone || null,
          managerId || null, managerName || null, id,
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

/**
 * Get Employee Attendance Records with Weekly & Monthly Filtering
 */
export async function getEmployeeAttendanceById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const mode = String(req.query.mode || 'monthly').toLowerCase(); // 'weekly' or 'monthly'

    const [users]: any = await pool.query('SELECT id, employee_id, full_name FROM users WHERE id = ? OR employee_id = ?', [id, id]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } });
      return;
    }
    const userId = users[0].id;

    let query = `
      SELECT id, work_date as workDate, clock_in as clockIn, clock_out as clockOut,
             work_hours as workHours, status, notes
      FROM attendance
      WHERE user_id = ?
    `;

    if (mode === 'weekly') {
      query += ` AND work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
    } else {
      query += ` AND work_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    }

    query += ` ORDER BY work_date DESC`;

    const [rows]: any = await pool.query(query, [userId]);

    const totalDays = rows.length;
    const presentDays = rows.filter((r: any) => r.status === 'PRESENT').length;
    const lateDays = rows.filter((r: any) => r.status === 'LATE').length;
    const absentDays = rows.filter((r: any) => r.status === 'ABSENT').length;
    const totalWorkHours = rows.reduce((acc: number, r: any) => acc + (parseFloat(r.workHours) || 0), 0);
    const avgWorkHours = totalDays > 0 ? (totalWorkHours / totalDays).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        mode,
        summary: {
          totalDays,
          presentDays,
          lateDays,
          absentDays,
          totalWorkHours: totalWorkHours.toFixed(1),
          avgWorkHours,
        },
        logs: rows,
      },
    });
  } catch (error) {
    console.error('Get Employee Attendance Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch attendance records.' } });
  }
}

