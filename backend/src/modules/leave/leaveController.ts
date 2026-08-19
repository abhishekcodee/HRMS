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
 * 1. Get Employee Annual Leave Balances
 */
export async function getLeaveBalances(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT id, user_id as userId, leave_type as leaveType,
              allocated_days as allocatedDays, used_days as usedDays
       FROM leave_balances
       WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Auto-initialize default balances for user
      await pool.query(
        `INSERT INTO leave_balances (id, user_id, leave_type, allocated_days, used_days) VALUES
         (UUID(), ?, 'Casual Leave', 12.00, 0.00),
         (UUID(), ?, 'Sick Leave', 10.00, 0.00),
         (UUID(), ?, 'Earned Leave', 15.00, 0.00)`,
        [userId, userId, userId]
      );

      const [newRows]: any = await pool.query(
        `SELECT id, user_id as userId, leave_type as leaveType,
                allocated_days as allocatedDays, used_days as usedDays
         FROM leave_balances
         WHERE user_id = ?`,
        [userId]
      );
      res.json({ success: true, data: newRows });
      return;
    }

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Leave Balances Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave balances.' } });
  }
}

/**
 * 2. Apply Leave Request - Save DB -> Check Overlaps & Balances -> Audit Log -> Dual Approval Queue -> Email Notification
 */
export async function applyLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const { leaveType, startDate, endDate, daysCount, reason, attachment } = req.body;

    if (!leaveType || !startDate || !endDate || !daysCount) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Leave Type, Start Date, End Date, and Days Count are required.' },
      });
      return;
    }

    const count = parseInt(String(daysCount), 10) || 1;
    if (count <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Number of days must be greater than 0.' },
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'From Date cannot be after To Date.' },
      });
      return;
    }

    // A. Prevent Overlapping Leave Applications for the same employee
    const [overlapRows]: any = await pool.query(
      `SELECT id FROM leave_requests
       WHERE user_id = ?
         AND status NOT IN ('REJECTED', 'CANCELLED')
         AND (
           (start_date <= ? AND end_date >= ?) OR
           (start_date <= ? AND end_date >= ?) OR
           (? <= start_date AND ? >= end_date)
         )`,
      [userId, endDate, startDate, startDate, startDate, startDate, endDate]
    );

    if (overlapRows.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'OVERLAPPING_LEAVE', message: 'You already have an active leave application overlapping with these dates.' },
      });
      return;
    }

    // B. Available Leave Balance Validation
    const [balRows]: any = await pool.query(
      `SELECT (allocated_days - used_days) as availableDays FROM leave_balances
       WHERE user_id = ? AND leave_type = ?`,
      [userId, leaveType.trim()]
    );

    if (balRows.length > 0) {
      const available = parseFloat(balRows[0].availableDays || '0');
      if (count > available) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: `Insufficient ${leaveType} balance. Requested: ${count} day(s), Available: ${available} day(s).`,
          },
        });
        return;
      }
    }

    // Retrieve user, employee profile & manager/admin IDs from MySQL
    const [userRows]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email,
              ep.department_name as departmentName, ep.manager_id as managerId, ep.manager_name as managerName
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

    // Determine Employer ID (Reporting Manager or default employer user)
    let employerId = userObj.managerId;
    if (!employerId) {
      const [empUser]: any = await pool.query(`SELECT id FROM users WHERE role = 'employer' LIMIT 1`);
      if (empUser.length > 0) employerId = empUser[0].id;
    }

    // Determine Admin ID
    let adminId: string | null = null;
    const [adminUser]: any = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminUser.length > 0) adminId = adminUser[0].id;

    // Step A: Save Leave Request in Database First (PENDING employer & admin status)
    await pool.query(
      `INSERT INTO leave_requests (
        id, user_id, leave_type, start_date, end_date, days_count, reason, attachment,
        employer_id, employer_status, admin_id, admin_status, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 'PENDING', 'PENDING')`,
      [
        leaveId,
        userId,
        leaveType.trim(),
        startDate.trim(),
        endDate.trim(),
        count,
        reason ? reason.trim() : null,
        attachment ? attachment.trim() : null,
        employerId || null,
        adminId || null,
      ]
    );

    // Step B: Create Audit Log Entry
    const clientIp = req.ip || '127.0.0.1';
    await pool.query(
      `INSERT INTO leave_audit_trail (id, leave_request_id, employee_id, action, previous_status, new_status, action_by, remarks, ip_address)
       VALUES (?, ?, ?, 'LEAVE_APPLIED', NULL, 'PENDING', ?, ?, ?)`,
      [uuidv4(), leaveId, userObj.employeeId, userObj.fullName, reason || 'Applied for leave', clientIp]
    );

    // Step C: Trigger HR Email Notification Immediately
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
      message: 'Leave request submitted successfully and routed for Dual Approval (Employer & Admin).',
      data: {
        id: leaveId,
        employeeId: userObj.employeeId,
        leaveType,
        startDate,
        endDate,
        daysCount: count,
        employerStatus: 'PENDING',
        adminStatus: 'PENDING',
        overallStatus: 'PENDING',
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
 * 3. List Leave Requests - Database Driven with Role Isolation & Dual Approval Fields
 */
export async function listLeaveRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const userEmpId = req.user?.employeeId || '';
    const { status, leaveType, search, view } = req.query;

    const activeView = view ? String(view).trim().toLowerCase() : (userRole || 'employee');

    let query = `
      SELECT lr.id, lr.user_id as userId, lr.leave_type as leaveType, lr.start_date as startDate,
             lr.end_date as endDate, lr.days_count as daysCount, lr.reason, lr.attachment,
             lr.employer_id as employerId, lr.employer_status as employerStatus,
             lr.employer_action_by as employerActionBy, lr.employer_action_at as employerActionAt,
             lr.employer_rejection_reason as employerRejectionReason,
             lr.admin_id as adminId, lr.admin_status as adminStatus,
             lr.admin_action_by as adminActionBy, lr.admin_action_at as adminActionAt,
             lr.admin_rejection_reason as adminRejectionReason,
             lr.status as status, lr.status as overallStatus,
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

    // Role View Filtering
    if (activeView === 'employee') {
      // Employee view: ONLY show own leave applications
      query += ` AND lr.user_id = ?`;
      params.push(userId);
    } else if (activeView === 'employer' || (userRole === 'employer' && activeView !== 'admin')) {
      // Employer / Manager view: ONLY show leave applications for reporting employees
      query += ` AND (lr.employer_id = ? OR ep.manager_id = ? OR ep.manager_id = ?)`;
      params.push(userId, userId, userEmpId);
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
 * 4. Employer / Manager Approval Action
 */
export async function employerActionOnLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'APPROVE' | 'REJECT'
    const reviewerId = req.user?.id;
    const reviewerName = req.user?.fullName || req.user?.email || 'Employer/Manager';

    if (!action || !['APPROVE', 'REJECT'].includes(String(action).toUpperCase())) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Action must be APPROVE or REJECT.' } });
      return;
    }

    const decision = String(action).toUpperCase();

    // Fetch leave request details
    const [rows]: any = await pool.query(
      `SELECT lr.id, lr.user_id as userId, lr.leave_type as leaveType, lr.start_date as startDate,
              lr.end_date as endDate, lr.days_count as daysCount, lr.status, lr.employer_status as employerStatus,
              lr.admin_status as adminStatus, u.employee_id as employeeId, u.full_name as employeeName,
              u.email as employeeEmail, ep.department_name as departmentName
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

    // Business Rule: Self-Approval Protection
    if (leaveObj.userId === reviewerId) {
      res.status(403).json({
        success: false,
        error: { code: 'SELF_APPROVAL_FORBIDDEN', message: 'Employees cannot approve or reject their own leave requests.' },
      });
      return;
    }

    // Business Rule: Cannot modify already finalized request
    if (leaveObj.status === 'APPROVED' || leaveObj.status === 'REJECTED') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_FINALIZED', message: `This leave request is already finalized as ${leaveObj.status}.` },
      });
      return;
    }

    const newEmployerStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const rejectionReason = decision === 'REJECT' ? (remarks ? String(remarks).trim() : 'Rejected by Employer/Manager') : null;

    // Determine new overall status: Approved if EITHER Employer OR Admin approves; Rejected if BOTH reject
    let newOverallStatus = 'PENDING';
    if (newEmployerStatus === 'APPROVED' || leaveObj.adminStatus === 'APPROVED') {
      newOverallStatus = 'APPROVED';
    } else if (newEmployerStatus === 'REJECTED' && leaveObj.adminStatus === 'REJECTED') {
      newOverallStatus = 'REJECTED';
    }

    // Update DB
    await pool.query(
      `UPDATE leave_requests
       SET employer_status = ?,
           employer_action_by = ?,
           employer_action_at = NOW(),
           employer_rejection_reason = ?,
           status = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE id = ?`,
      [newEmployerStatus, reviewerName, rejectionReason, newOverallStatus, reviewerId, id]
    );

    // If final status became APPROVED, recalculate leave balance accurately
    if (newOverallStatus === 'APPROVED') {
      await pool.query(
        `UPDATE leave_balances
         SET used_days = (
           SELECT COALESCE(SUM(days_count), 0)
           FROM leave_requests
           WHERE user_id = ? AND leave_type = ? AND status = 'APPROVED'
         )
         WHERE user_id = ? AND leave_type = ?`,
        [leaveObj.userId, leaveObj.leaveType, leaveObj.userId, leaveObj.leaveType]
      );
    }

    // Audit Trail
    const clientIp = req.ip || '127.0.0.1';
    await pool.query(
      `INSERT INTO leave_audit_trail (id, leave_request_id, employee_id, action, previous_status, new_status, action_by, remarks, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        id,
        leaveObj.employeeId,
        `EMPLOYER_LEAVE_${decision}`,
        leaveObj.status,
        newOverallStatus,
        reviewerName,
        remarks || `Employer marked request as ${newEmployerStatus}`,
        clientIp,
      ]
    );

    // Trigger Notification Email
    if (newOverallStatus === 'APPROVED') {
      await sendLeaveApprovalEmail({
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
    } else if (newOverallStatus === 'REJECTED') {
      await sendLeaveRejectionEmail({
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
        rejectionRemarks: rejectionReason || 'Rejected during dual approval workflow.',
      });
    }

    res.json({
      success: true,
      message: `Employer action recorded successfully. Employer status: ${newEmployerStatus}, Overall status: ${newOverallStatus}`,
      data: {
        id,
        employerStatus: newEmployerStatus,
        adminStatus: leaveObj.adminStatus,
        overallStatus: newOverallStatus,
        status: newOverallStatus,
      },
    });
  } catch (error: any) {
    logger.error('Employer Action Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to record employer action.' } });
  }
}

/**
 * 5. Admin Approval Action
 */
export async function adminActionOnLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'APPROVE' | 'REJECT'
    const reviewerId = req.user?.id;
    const reviewerName = req.user?.fullName || req.user?.email || 'Admin';

    if (!action || !['APPROVE', 'REJECT'].includes(String(action).toUpperCase())) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Action must be APPROVE or REJECT.' } });
      return;
    }

    const decision = String(action).toUpperCase();

    // Fetch leave request details
    const [rows]: any = await pool.query(
      `SELECT lr.id, lr.user_id as userId, lr.leave_type as leaveType, lr.start_date as startDate,
              lr.end_date as endDate, lr.days_count as daysCount, lr.status, lr.employer_status as employerStatus,
              lr.admin_status as adminStatus, u.employee_id as employeeId, u.full_name as employeeName,
              u.email as employeeEmail, ep.department_name as departmentName
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

    // Business Rule: Self-Approval Protection
    if (leaveObj.userId === reviewerId) {
      res.status(403).json({
        success: false,
        error: { code: 'SELF_APPROVAL_FORBIDDEN', message: 'Employees cannot approve or reject their own leave requests.' },
      });
      return;
    }

    // Business Rule: Cannot modify already finalized request
    if (leaveObj.status === 'APPROVED' || leaveObj.status === 'REJECTED') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_FINALIZED', message: `This leave request is already finalized as ${leaveObj.status}.` },
      });
      return;
    }

    const newAdminStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const rejectionReason = decision === 'REJECT' ? (remarks ? String(remarks).trim() : 'Rejected by Admin') : null;

    // Determine new overall status: Approved if EITHER Employer OR Admin approves; Rejected if BOTH reject
    let newOverallStatus = 'PENDING';
    if (newAdminStatus === 'APPROVED' || leaveObj.employerStatus === 'APPROVED') {
      newOverallStatus = 'APPROVED';
    } else if (newAdminStatus === 'REJECTED' && leaveObj.employerStatus === 'REJECTED') {
      newOverallStatus = 'REJECTED';
    }

    // Update DB
    await pool.query(
      `UPDATE leave_requests
       SET admin_status = ?,
           admin_action_by = ?,
           admin_action_at = NOW(),
           admin_rejection_reason = ?,
           status = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE id = ?`,
      [newAdminStatus, reviewerName, rejectionReason, newOverallStatus, reviewerId, id]
    );

    // If final status became APPROVED, recalculate leave balance accurately
    if (newOverallStatus === 'APPROVED') {
      await pool.query(
        `UPDATE leave_balances
         SET used_days = (
           SELECT COALESCE(SUM(days_count), 0)
           FROM leave_requests
           WHERE user_id = ? AND leave_type = ? AND status = 'APPROVED'
         )
         WHERE user_id = ? AND leave_type = ?`,
        [leaveObj.userId, leaveObj.leaveType, leaveObj.userId, leaveObj.leaveType]
      );
    }

    // Audit Trail
    const clientIp = req.ip || '127.0.0.1';
    await pool.query(
      `INSERT INTO leave_audit_trail (id, leave_request_id, employee_id, action, previous_status, new_status, action_by, remarks, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        id,
        leaveObj.employeeId,
        `ADMIN_LEAVE_${decision}`,
        leaveObj.status,
        newOverallStatus,
        reviewerName,
        remarks || `Admin marked request as ${newAdminStatus}`,
        clientIp,
      ]
    );

    // Trigger Notification Email
    if (newOverallStatus === 'APPROVED') {
      await sendLeaveApprovalEmail({
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
    } else if (newOverallStatus === 'REJECTED') {
      await sendLeaveRejectionEmail({
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
        rejectionRemarks: rejectionReason || 'Rejected during dual approval workflow.',
      });
    }

    res.json({
      success: true,
      message: `Admin action recorded successfully. Admin status: ${newAdminStatus}, Overall status: ${newOverallStatus}`,
      data: {
        id,
        employerStatus: leaveObj.employerStatus,
        adminStatus: newAdminStatus,
        overallStatus: newOverallStatus,
        status: newOverallStatus,
      },
    });
  } catch (error: any) {
    logger.error('Admin Action Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to record admin action.' } });
  }
}

/**
 * 6. Legacy Approve Leave Handler (Compatibility wrapper around admin/employer action)
 */
export async function approveLeave(req: AuthRequest, res: Response): Promise<void> {
  const role = req.user?.role;
  if (role === 'employer') {
    req.body = { ...req.body, action: 'APPROVE' };
    return employerActionOnLeave(req, res);
  }
  req.body = { ...req.body, action: 'APPROVE' };
  return adminActionOnLeave(req, res);
}

/**
 * 7. Legacy Reject Leave Handler (Compatibility wrapper around admin/employer action)
 */
export async function rejectLeave(req: AuthRequest, res: Response): Promise<void> {
  const role = req.user?.role;
  if (role === 'employer') {
    req.body = { ...req.body, action: 'REJECT' };
    return employerActionOnLeave(req, res);
  }
  req.body = { ...req.body, action: 'REJECT' };
  return adminActionOnLeave(req, res);
}

/**
 * 8. Get Leave Audit Trail
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
 * 9. Get Email Notification Delivery Logs
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
 * 10. Retry Failed Email Notification
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
