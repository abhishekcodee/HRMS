import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get Personal Employee Dashboard Summary
 * Strictly filtered by WHERE user_id = req.user.id
 */
export async function getEmployeeDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    // 1. Fetch User Profile
    const [users]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.phone,
              u.role, u.status, u.profile_photo as profilePhoto, u.last_login_at as lastLoginAt,
              ep.department_name as departmentName, ep.designation, ep.joining_date as joiningDate, ep.salary
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found.' } });
      return;
    }

    const profile = users[0];

    // 2. Fetch Isolated Attendance Summary
    const [attendanceRows]: any = await pool.query(
      `SELECT id, work_date as workDate, clock_in as clockIn, clock_out as clockOut, work_hours as workHours, status, notes
       FROM attendance
       WHERE user_id = ?
       ORDER BY work_date DESC LIMIT 10`,
      [userId]
    );

    // 3. Fetch Isolated Leave Requests
    const [leaveRows]: any = await pool.query(
      `SELECT id, leave_type as leaveType, start_date as startDate, end_date as endDate, days_count as daysCount, reason, status, created_at as createdAt
       FROM leave_requests
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    // 4. Fetch Isolated Latest Payroll Record
    const [payrollRows]: any = await pool.query(
      `SELECT id, pay_period as payPeriod, basic_salary as basicSalary, allowances, deductions, net_salary as netSalary, status, disbursed_at as disbursedAt
       FROM payroll_records
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    // 5. Fetch Isolated Documents
    const [docRows]: any = await pool.query(
      `SELECT id, title, document_type as documentType, file_url as fileUrl, file_size as fileSize, uploaded_at as uploadedAt
       FROM employee_documents
       WHERE user_id = ?
       ORDER BY uploaded_at DESC LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        profile,
        attendance: attendanceRows,
        leaveRequests: leaveRows,
        leaveBalance: {
          casualLeave: 12,
          sickLeave: 7,
          earnedLeave: 15,
        },
        latestPayroll: payrollRows[0] || null,
        documents: docRows,
      },
    });
  } catch (error) {
    console.error('Get Employee Dashboard Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee dashboard data.' } });
  }
}

/**
 * Get Logged-In Employee Profile
 */
export async function getEmployeeProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const [rows]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.phone,
              u.role, u.status, u.profile_photo as profilePhoto, u.last_login_at as lastLoginAt,
              ep.department_name as departmentName, ep.designation, ep.joining_date as joiningDate, ep.salary
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found.' } });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch profile.' } });
  }
}

/**
 * Get Logged-In Employee Attendance History
 * Strictly WHERE user_id = req.user.id
 */
export async function getEmployeeAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const [rows]: any = await pool.query(
      `SELECT id, work_date as workDate, clock_in as clockIn, clock_out as clockOut, work_hours as workHours, status, notes
       FROM attendance
       WHERE user_id = ?
       ORDER BY work_date DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch attendance.' } });
  }
}

/**
 * Get Logged-In Employee Leave History & Balances
 * Strictly WHERE user_id = req.user.id
 */
export async function getEmployeeLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const [rows]: any = await pool.query(
      `SELECT id, leave_type as leaveType, start_date as startDate, end_date as endDate, days_count as daysCount, reason, status, created_at as createdAt
       FROM leave_requests
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        requests: rows,
        balances: [
          { type: 'Casual Leave', code: 'CL', total: 12, used: 2, available: 10 },
          { type: 'Sick Leave', code: 'SL', total: 7, used: 1, available: 6 },
          { type: 'Earned Leave', code: 'EL', total: 15, used: 0, available: 15 },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave records.' } });
  }
}

/**
 * Get Logged-In Employee Payslips
 * Strictly WHERE user_id = req.user.id
 */
export async function getEmployeePayroll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const [rows]: any = await pool.query(
      `SELECT id, pay_period as payPeriod, basic_salary as basicSalary, allowances, deductions, net_salary as netSalary, status, disbursed_at as disbursedAt
       FROM payroll_records
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch payslips.' } });
  }
}

/**
 * Get Logged-In Employee Personal Documents
 * Strictly WHERE user_id = req.user.id
 */
export async function getEmployeeDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const [rows]: any = await pool.query(
      `SELECT id, title, document_type as documentType, file_url as fileUrl, file_size as fileSize, uploaded_at as uploadedAt
       FROM employee_documents
       WHERE user_id = ?
       ORDER BY uploaded_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents.' } });
  }
}
