import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import {
  sendLeaveAppliedEmail,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
  retryFailedNotification,
} from '../../services/emailService.js';
import { logger } from '../../utils/logger.js';

/**
 * 1. Apply Leave Request - Save DB -> Audit Log -> Send HR Email -> Log Email
 */
export async function applyLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const { leaveType, startDate, endDate, daysCount, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !daysCount) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Leave Type, Start Date, End Date, and Days Count are required.' },
      });
      return;
    }

    // Retrieve user and profile details from MySQL
    const [userRows]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email,
              ep.department_name as departmentName
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User record not found.' } });
      return;
    }

    const userObj = userRows[0];
    const leaveId = uuidv4();
    const count = parseInt(String(daysCount), 10) || 1;

    // Step A: Save Leave Request in Database First
    await pool.query(
      `INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, days_count, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [leaveId, userId, leaveType.trim(), startDate.trim(), endDate.trim(), count, reason ? reason.trim() : null]
    );

    // Step B: Create Audit Log Entry
    const clientIp = req.ip || '127.0.0.1';
    await pool.query(
      `INSERT INTO leave_audit_trail (id, leave_request_id, employee_id, action, previous_status, new_status, action_by, remarks, ip_address)
       VALUES (?, ?, ?, 'LEAVE_APPLIED', NULL, 'PENDING', ?, ?, ?)`,
      [uuidv4(), leaveId, userObj.employeeId, userObj.fullName, reason || 'Applied for leave', clientIp]
    );

    // Step C: Trigger HR Email Notification Immediately (Non-blocking DB result)
    const emailResult = await sendLeaveAppliedEmail({
      leaveRequestId: leaveId,
      employeeId: userObj.employeeId,
      employeeName: userObj.fullName,
      employeeEmail: userObj.email,
      departmentName: userObj.departmentName || 'General',
      leaveType,
      startDate,
      endDate,
      daysCount: count,
      reason,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: {
        id: leaveId,
        employeeId: userObj.employeeId,
        leaveType,
        startDate,
        endDate,
        daysCount: count,
        status: 'PENDING',
        emailNotificationSent: emailResult.success,
      },
    });
  } catch (error: any) {
    logger.error('Apply Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit leave request.' } });
  }
}

/**
 * 2. List Leave Requests - Database Driven with Role Isolation
 */
export async function listLeaveRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { status, leaveType, search } = req.query;

    let query = `
      SELECT lr.id, lr.user_id as userId, lr.leave_type as leaveType, lr.start_date as startDate,
             lr.end_date as endDate, lr.days_count as daysCount, lr.reason, lr.status,
             lr.rejection_remarks as rejectionRemarks, lr.reviewed_by as reviewedBy, lr.reviewed_at as reviewedAt,
             lr.created_at as createdAt,
             u.employee_id as employeeId, u.full_name as employeeName, u.email as employeeEmail,
             ep.department_name as departmentName
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Role Isolation: Employee can ONLY view own leave requests
    if (userRole === 'employee') {
      query += ` AND lr.user_id = ?`;
      params.push(userId);
    }

    if (status && String(status).trim() !== 'ALL') {
      query += ` AND lr.status = ?`;
      params.push(String(status).trim().toUpperCase());
    }

    if (leaveType) {
      query += ` AND lr.leave_type = ?`;
      params.push(String(leaveType).trim());
    }

    if (search) {
      const term = `%${String(search).trim()}%`;
      query += ` AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(u.employee_id) LIKE LOWER(?))`;
      params.push(term, term);
    }

    query += ` ORDER BY lr.created_at DESC`;

    const [rows]: any = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    logger.error('List Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave requests.' } });
  }
}

/**
 * 3. Approve Leave Request (HR / Admin) - Update DB -> Audit Log -> Trigger Email
 */
export async function approveLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id;
    const reviewerEmail = req.user?.email || 'admin@hrms.com';

    // Retrieve leave request & employee info
    const [rows]: any = await pool.query(
      `SELECT lr.id, lr.user_id as userId, lr.leave_type as leaveType, lr.start_date as startDate,
              lr.end_date as endDate, lr.days_count as daysCount, lr.reason, lr.status,
              u.employee_id as employeeId, u.full_name as employeeName, u.email as employeeEmail,
              ep.department_name as departmentName
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE lr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave request not found.' } });
      return;
    }

    const leaveObj = rows[0];
    const previousStatus = leaveObj.status;

    // Step A: Update Database Status
    await pool.query(
      `UPDATE leave_requests
       SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [reviewerId, id]
    );

    // Step B: Create Leave Audit Log Entry
    const clientIp = req.ip || '127.0.0.1';
    await pool.query(
      `INSERT INTO leave_audit_trail (id, leave_request_id, employee_id, action, previous_status, new_status, action_by, remarks, ip_address)
       VALUES (?, ?, ?, 'LEAVE_APPROVED', ?, 'APPROVED', ?, 'Approved by HR', ?)`,
      [uuidv4(), id, leaveObj.employeeId, previousStatus, reviewerEmail, clientIp]
    );

    // Step C: Trigger Approval Email to Employee Automatically
    const emailResult = await sendLeaveApprovalEmail({
      leaveRequestId: id,
      employeeId: leaveObj.employeeId,
      employeeName: leaveObj.employeeName,
      employeeEmail: leaveObj.employeeEmail,
      departmentName: leaveObj.departmentName,
      leaveType: leaveObj.leaveType,
      startDate: leaveObj.startDate,
      endDate: leaveObj.endDate,
      daysCount: leaveObj.daysCount,
      status: 'APPROVED',
    });

    res.json({
      success: true,
      message: `Leave request for ${leaveObj.employeeName} approved successfully.`,
      data: {
        id,
        status: 'APPROVED',
        emailNotificationSent: emailResult.success,
      },
    });
  } catch (error: any) {
    logger.error('Approve Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve leave request.' } });
  }
}

/**
 * 4. Reject Leave Request (HR / Admin) - Update DB -> Audit Log -> Trigger Email
 */
export async function rejectLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const reviewerId = req.user?.id;
    const reviewerEmail = req.user?.email || 'admin@hrms.com';

    // Retrieve leave request & employee info
    const [rows]: any = await pool.query(
      `SELECT lr.id, lr.user_id as userId, lr.leave_type as leaveType, lr.start_date as startDate,
              lr.end_date as endDate, lr.days_count as daysCount, lr.reason, lr.status,
              u.employee_id as employeeId, u.full_name as employeeName, u.email as employeeEmail,
              ep.department_name as departmentName
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE lr.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave request not found.' } });
      return;
    }

    const leaveObj = rows[0];
    const previousStatus = leaveObj.status;
    const rejectionRemarks = remarks ? String(remarks).trim() : 'Operational requirements';

    // Step A: Update Database Status & Rejection Remarks
    await pool.query(
      `UPDATE leave_requests
       SET status = 'REJECTED', rejection_remarks = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [rejectionRemarks, reviewerId, id]
    );

    // Step B: Create Leave Audit Log Entry
    const clientIp = req.ip || '127.0.0.1';
    await pool.query(
      `INSERT INTO leave_audit_trail (id, leave_request_id, employee_id, action, previous_status, new_status, action_by, remarks, ip_address)
       VALUES (?, ?, ?, 'LEAVE_REJECTED', ?, 'REJECTED', ?, ?, ?)`,
      [uuidv4(), id, leaveObj.employeeId, previousStatus, reviewerEmail, rejectionRemarks, clientIp]
    );

    // Step C: Trigger Rejection Email to Employee Automatically
    const emailResult = await sendLeaveRejectionEmail({
      leaveRequestId: id,
      employeeId: leaveObj.employeeId,
      employeeName: leaveObj.employeeName,
      employeeEmail: leaveObj.employeeEmail,
      departmentName: leaveObj.departmentName,
      leaveType: leaveObj.leaveType,
      startDate: leaveObj.startDate,
      endDate: leaveObj.endDate,
      daysCount: leaveObj.daysCount,
      status: 'REJECTED',
      rejectionRemarks,
    });

    res.json({
      success: true,
      message: `Leave request for ${leaveObj.employeeName} rejected.`,
      data: {
        id,
        status: 'REJECTED',
        rejectionRemarks,
        emailNotificationSent: emailResult.success,
      },
    });
  } catch (error: any) {
    logger.error('Reject Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to reject leave request.' } });
  }
}

/**
 * 5. Get Leave Audit Trail
 */
export async function getLeaveAuditTrail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, leave_request_id as leaveRequestId, employee_id as employeeId, action,
              previous_status as previousStatus, new_status as newStatus, action_by as actionBy,
              action_date as actionDate, remarks, ip_address as ipAddress
       FROM leave_audit_trail
       ORDER BY action_date DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    logger.error('Get Leave Audit Trail Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave audit trail.' } });
  }
}

/**
 * 6. Get Email Notification Delivery Logs
 */
export async function getEmailLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, employee_id as employeeId, leave_request_id as leaveRequestId,
              recipient_email as recipientEmail, email_type as emailType, subject, status,
              sent_at as sentAt, error_message as errorMessage, retry_count as retryCount,
              created_at as createdAt
       FROM email_notifications
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    logger.error('Get Email Logs Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch email logs.' } });
  }
}

/**
 * 7. Retry Failed Email Notification
 */
export async function retryNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await retryFailedNotification(id);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'RETRY_FAILED', message: result.message } });
      return;
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to retry email notification.' } });
  }
}
