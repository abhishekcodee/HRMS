import { Response } from 'express';
import { LEAVE_TYPES, countLeaveDays, normaliseLeaveCode, parseDateOnly } from './leaveDays.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { isHr } from '../../security/accessControl.js';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import {
  sendLeaveAppliedEmail,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
  retryFailedNotification,
} from '../../services/emailService.js';
import {
  calculateEmployeeLeaveSummary,
  calculateCL,
  calculatePL,
  calculateCLPLDuration,
  getFinancialYear,
  calculatePLEntitlement,
} from './leaveCalculationService.js';
import { insertInAppNotification } from '../notifications/notificationsController.js';
import { logger } from '../../utils/logger.js';

/**
 * 1. Get Employee Annual Leave Balances (Dynamic CL & PL)
 */
export async function getLeaveBalances(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const summary = await calculateEmployeeLeaveSummary(userId);

    res.json({
      success: true,
      summary,
      data: [
        {
          id: `${userId}-cl`,
          userId,
          leaveType: 'CL',
          allocatedDays: summary.cl.allocated,
          usedDays: summary.cl.used,
          pendingDays: summary.cl.pending,
          remainingDays: summary.cl.remaining,
        },
        {
          id: `${userId}-pl`,
          userId,
          leaveType: 'PL',
          allocatedDays: summary.pl.allocated,
          usedDays: summary.pl.used,
          pendingDays: summary.pl.pending,
          remainingDays: summary.pl.remaining,
        },
      ],
    });
  } catch (error: any) {
    logger.error('Get Leave Balances Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave balances.' } });
  }
}

/**
 * 2. Apply Leave Request - Dynamic CL/PL Validation & Day Calculation
 */
export async function applyLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const { leaveType, reason, attachment } = req.body;
    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate || req.body.startDate);

    if (!leaveType || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Choose a leave type and valid From / To dates.' },
      });
      return;
    }

    const normType = normaliseLeaveCode(leaveType);
    if (!normType) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_LEAVE_TYPE', message: `Leave type must be one of: ${Object.values(LEAVE_TYPES).map((t) => t.label).join(', ')}.` },
      });
      return;
    }

    if (startDate > endDate) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The To date cannot be before the From date.' } });
      return;
    }
    const spanDays = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 + 1;
    if (spanDays > 180) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A single leave application cannot be longer than 180 days.' } });
      return;
    }

    // Half day: only for a single date. The number of days is always counted by the server (working days only)
    const halfDayRaw = String(req.body.halfDay ?? req.body.session ?? '').toUpperCase();
    const halfSession = ['FIRST_HALF', 'SECOND_HALF'].includes(halfDayRaw) ? halfDayRaw : (req.body.halfDay === true || halfDayRaw === 'TRUE' ? 'FIRST_HALF' : null);
    if (halfSession && startDate !== endDate) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A half-day leave must start and end on the same date.' } });
      return;
    }
    const [companyRow]: any = await pool.query('SELECT company_id FROM users WHERE id = ?', [userId]);
    const dayCount = await countLeaveDays(companyRow[0]?.company_id || null, startDate, endDate, !!halfSession);
    const count = dayCount.days;
    if (count <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_WORKING_DAYS', message: `No leave is needed: ${dayCount.skipped.map((d) => `${d.date} is a ${d.reason.toLowerCase()}`).join(', ')}.` },
      });
      return;
    }

    // A. Prevent Overlapping Leave Applications for the same employee
    const [overlapRows]: any = await pool.query(
      `SELECT id, start_date, end_date FROM leave_requests
       WHERE user_id = ?
         AND UPPER(status) NOT IN ('REJECTED', 'CANCELLED', 'WITHDRAWN')
         AND start_date <= ? AND end_date >= ?`,
      [userId, endDate, startDate]
    );

    if (overlapRows.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'OVERLAPPING_LEAVE',
          message: `You already have a leave application for ${String(overlapRows[0].start_date).slice(0, 10)} to ${String(overlapRows[0].end_date).slice(0, 10)} that overlaps these dates.`,
        },
      });
      return;
    }

    // B. Server-side balance check for CL / PL / SL (LWP has no balance)
    if (LEAVE_TYPES[normType].balance) {
      const summary = await calculateEmployeeLeaveSummary(userId);
      const targetBal = normType === 'CL' ? summary.cl : normType === 'PL' ? summary.pl : summary.sl;
      if (count > targetBal.remaining) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: `Not enough ${LEAVE_TYPES[normType].label} balance: you asked for ${count} day(s) and have ${targetBal.remaining} left. Apply the rest as Leave Without Pay.`,
          },
        });
        return;
      }
    }

    // Retrieve user, employee profile & manager/admin IDs from MySQL
    const [userRows]: any = await pool.query(
      `SELECT u.id, u.company_id as companyId, u.employee_id as employeeId, u.full_name as fullName, u.email,
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
    // Approvers always come from the employee's own company and must be active
    let employerId: string | null = null;
    if (userObj.managerId) {
      const [mgr]: any = await pool.query(
        `SELECT id FROM users WHERE (id = ? OR employee_id = ?) AND company_id <=> ? AND LOWER(status) = 'active' LIMIT 1`,
        [userObj.managerId, userObj.managerId, userObj.companyId]
      );
      if (mgr.length > 0) employerId = mgr[0].id;
    }
    if (!employerId) {
      const [empUser]: any = await pool.query(
        `SELECT id FROM users WHERE role = 'employer' AND company_id <=> ? AND LOWER(status) = 'active' AND id <> ? ORDER BY created_at LIMIT 1`,
        [userObj.companyId, userId]
      );
      if (empUser.length > 0) employerId = empUser[0].id;
    }

    // Determine Admin ID (same company only)
    let adminId: string | null = null;
    const [adminUser]: any = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' AND company_id <=> ? AND LOWER(status) = 'active' LIMIT 1`,
      [userObj.companyId]
    );
    if (adminUser.length > 0) adminId = adminUser[0].id;

    // Step A: Save Leave Request in Database First (PENDING employer & admin status)
    await pool.query(
      `INSERT INTO leave_requests (
        id, company_id, user_id, leave_type, start_date, end_date, days_count, half_day, reason, attachment,
        employer_id, employer_status, admin_id, admin_status, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 'PENDING', 'PENDING')`,
      [
        leaveId,
        userObj.companyId || null,
        userId,
        normType,
        startDate,
        endDate,
        count,
        halfSession,
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

    // Step C: Trigger HR Email & In-App Notification
    await insertInAppNotification({
      userId,
      type: 'LEAVE',
      title: 'Leave Application Submitted',
      message: `${userObj.fullName} applied for ${count} day(s) of ${leaveType} (${startDate} to ${endDate}).`,
      link: '/my-leave',
    });

    // Notify the approver (reporting manager / company HR), never a hard-coded address
    let approverEmail: string | undefined;
    if (employerId) {
      const [ap]: any = await pool.query('SELECT email FROM users WHERE id = ?', [employerId]);
      approverEmail = ap[0]?.email || undefined;
      await insertInAppNotification({
        userId: employerId,
        type: 'LEAVE',
        title: 'Leave request to review',
        message: `${userObj.fullName} applied for ${count} day(s) of ${LEAVE_TYPES[normType].label} (${startDate} to ${endDate}).`,
        link: '/leave',
      });
    }
    const emailResult = await sendLeaveAppliedEmail({
      hrEmail: approverEmail,
      leaveRequestId: leaveId,
      employeeId: userObj.employeeId,
      employeeName: userObj.fullName,
      employeeEmail: userObj.email,
      departmentName: userObj.departmentName || 'General',
      leaveType: LEAVE_TYPES[normType].label,
      startDate,
      endDate,
      daysCount: count,
      reason,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: `Leave request for ${count} day(s) submitted to HR for approval.`,
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

    // Employees can only ever use the employee view, whatever they ask for
    const requestedView = view ? String(view).trim().toLowerCase() : (userRole || 'employee');
    const activeView = isHr(req) ? requestedView : 'employee';

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

    // Company boundary
    if (!(req.isSuperAdmin && !req.tenantId)) {
      query += ` AND u.company_id = ?`;
      params.push(getTenantId(req));
    }

    // Role View Filtering
    if (activeView === 'employee') {
      // Employee view: ONLY show own leave applications
      query += ` AND lr.user_id = ?`;
      params.push(userId);
    } else if (activeView === 'manager') {
      // Reporting-manager view: only direct reports
      query += ` AND (lr.employer_id = ? OR ep.manager_id = ? OR ep.manager_id = ?)`;
      params.push(userId, userId, userEmpId);
    }
    // HR (employer/admin) views show every request in the company

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
       WHERE lr.id = ? AND (? = 1 OR u.company_id = ?)`,
      [id, req.isSuperAdmin && !req.tenantId ? 1 : 0, getTenantId(req)]
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

    // HR's decision is final: approve -> APPROVED, reject -> REJECTED (frees the dates and the balance)
    const newOverallStatus = newEmployerStatus;

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
       WHERE lr.id = ? AND (? = 1 OR u.company_id = ?)`,
      [id, req.isSuperAdmin && !req.tenantId ? 1 : 0, getTenantId(req)]
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

    // The reviewer's decision is final
    const newOverallStatus = newAdminStatus;

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
       FROM leave_audit_trail t
       WHERE t.leave_request_id IN (
         SELECT lr.id FROM leave_requests lr JOIN users u ON u.id = lr.user_id WHERE u.company_id = ?
       )
       ORDER BY action_date DESC
       LIMIT 100`,
      [getTenantId(req)]
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
       FROM email_notifications n
       WHERE n.leave_request_id IN (
         SELECT lr.id FROM leave_requests lr JOIN users u ON u.id = lr.user_id WHERE u.company_id = ?
       )
       ORDER BY created_at DESC
       LIMIT 100`,
      [getTenantId(req)]
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

/**
 * 11. Get Employee Specific Leave Balances & Allocation for Profile
 */
export async function getEmployeeLeaveBalances(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const year = parseInt((req.query.year as string) || '2026', 10);

    if (!userId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User ID is required.' } });
      return;
    }

    // 0. Ensure server-side dynamic CL & PL entitlements based on DOJ and PL formula are calculated & synced
    let summary: any = null;
    try {
      summary = await calculateEmployeeLeaveSummary(userId);
    } catch (_) {}

    const defaultTypes = [
      { name: 'Casual Leave', code: 'CL', defaultAlloc: summary ? summary.cl.allocated : 10 },
      { name: 'Sick Leave', code: 'SL', defaultAlloc: 7 },
      { name: 'Earned Leave', code: 'EL', defaultAlloc: 14 },
      { name: 'Privilege Leave', code: 'PL', defaultAlloc: summary ? summary.pl.allocated : 14 },
      { name: 'Paid Leave', code: 'PAID', defaultAlloc: 10 },
      { name: 'Unpaid Leave (LWP)', code: 'LWP', defaultAlloc: 0 },
    ];

    // 1. Fetch allocated days from leave_balances
    const [balanceRows]: any = await pool.query(
      `SELECT leave_type as leaveType, allocated_days as allocatedDays
       FROM leave_balances
       WHERE user_id = ?`,
      [userId]
    );

    const allocMap: Record<string, number> = {};
    balanceRows.forEach((r: any) => {
      const val = parseFloat(r.allocatedDays);
      allocMap[r.leaveType] = val;
      const lt = String(r.leaveType).toUpperCase();
      if (lt === 'CL' || lt.includes('CASUAL')) allocMap['Casual Leave'] = val;
      if (lt === 'PL' || lt.includes('PRIVILEGE') || lt.includes('EARNED')) allocMap['Privilege Leave'] = val;
      if (lt === 'SL' || lt.includes('SICK')) allocMap['Sick Leave'] = val;
      if (lt === 'EL') allocMap['Earned Leave'] = val;
    });

    // 2. Fetch approved used days from leave_requests
    const [usedRows]: any = await pool.query(
      `SELECT leave_type as leaveType, COALESCE(SUM(days_count), 0) as totalUsed
       FROM leave_requests
       WHERE user_id = ? AND status = 'APPROVED' AND YEAR(created_at) = ?
       GROUP BY leave_type`,
      [userId, year]
    );

    const usedMap: Record<string, number> = {};
    usedRows.forEach((r: any) => {
      const val = parseFloat(r.totalUsed);
      usedMap[r.leaveType] = val;
      const lt = String(r.leaveType).toUpperCase();
      if (lt === 'CL' || lt.includes('CASUAL')) usedMap['Casual Leave'] = val;
      if (lt === 'PL' || lt.includes('PRIVILEGE') || lt.includes('EARNED')) usedMap['Privilege Leave'] = val;
      if (lt === 'SL' || lt.includes('SICK')) usedMap['Sick Leave'] = val;
    });

    // 3. Fetch pending days from leave_requests
    const [pendingRows]: any = await pool.query(
      `SELECT leave_type as leaveType, COALESCE(SUM(days_count), 0) as totalPending
       FROM leave_requests
       WHERE user_id = ? AND status = 'PENDING' AND YEAR(created_at) = ?
       GROUP BY leave_type`,
      [userId, year]
    );

    const pendingMap: Record<string, number> = {};
    pendingRows.forEach((r: any) => {
      const val = parseFloat(r.totalPending);
      pendingMap[r.leaveType] = val;
      const lt = String(r.leaveType).toUpperCase();
      if (lt === 'CL' || lt.includes('CASUAL')) pendingMap['Casual Leave'] = val;
      if (lt === 'PL' || lt.includes('PRIVILEGE') || lt.includes('EARNED')) pendingMap['Privilege Leave'] = val;
      if (lt === 'SL' || lt.includes('SICK')) pendingMap['Sick Leave'] = val;
    });

    // 4. Construct complete result
    let totalAllocated = 0;
    let totalUsed = 0;
    let totalPending = 0;
    let totalRemaining = 0;

    const leaveTypes = defaultTypes.map(t => {
      let allocated = allocMap[t.code] !== undefined ? allocMap[t.code] : (allocMap[t.name] !== undefined ? allocMap[t.name] : t.defaultAlloc);
      let used = usedMap[t.code] !== undefined ? usedMap[t.code] : (usedMap[t.name] || 0);
      let pending = pendingMap[t.code] !== undefined ? pendingMap[t.code] : (pendingMap[t.name] || 0);

      if (t.code === 'CL' && summary) {
        allocated = summary.cl.allocated;
        used = summary.cl.used;
        pending = summary.cl.pending;
      }
      if (t.code === 'PL' && summary) {
        allocated = summary.pl.allocated;
        used = summary.pl.used;
        pending = summary.pl.pending;
      }

      const remaining = Math.max(0, allocated - used - pending);

      totalAllocated += allocated;
      totalUsed += used;
      totalPending += pending;
      totalRemaining += remaining;

      return {
        leaveType: t.name,
        code: t.code,
        allocated,
        used,
        pending,
        remaining,
      };
    });

    res.json({
      success: true,
      data: {
        userId,
        year,
        summary: {
          totalAllocated,
          totalUsed,
          totalPending,
          totalRemaining,
        },
        leaveTypes,
      },
    });
  } catch (error: any) {
    logger.error('Get Employee Leave Balances Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee leave balances.' } });
  }
}

/**
 * 12. Allocate / Update Leave Days Individually Per Employee & Year
 */
export async function allocateEmployeeLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId, year, allocations } = req.body;

    if (!userId || !year || !Array.isArray(allocations)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User ID, Leave Year, and Allocations array are required.' } });
      return;
    }

    const leaveYear = parseInt(year, 10);

    for (const item of allocations) {
      const { leaveType, allocatedDays } = item;
      const alloc = Math.max(0, parseFloat(allocatedDays) || 0);

      await pool.query(
        `INSERT INTO leave_balances (id, user_id, leave_type, leave_year, allocated_days)
         VALUES (UUID(), ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days)`,
        [userId, leaveType, leaveYear, alloc]
      );
    }

    res.json({
      success: true,
      message: `Leave allocations updated successfully for year ${leaveYear}.`,
    });
  } catch (error: any) {
    logger.error('Allocate Employee Leave Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save leave allocation.' } });
  }
}

/**
 * 13. Get Employee Specific Leave Request History with Filters
 */
export async function getEmployeeLeaveHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { leaveType, status, year } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'User ID is required.' } });
      return;
    }

    let query = `
      SELECT id, leave_type as leaveType, start_date as startDate, end_date as endDate,
             days_count as daysCount, reason, status, employer_status as employerStatus,
             admin_status as adminStatus, created_at as createdAt
      FROM leave_requests
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (leaveType && leaveType !== 'ALL') {
      query += ` AND leave_type = ?`;
      params.push(leaveType);
    }

    if (status && status !== 'ALL') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (year) {
      query += ` AND YEAR(created_at) = ?`;
      params.push(parseInt(year as string, 10));
    }

    query += ` ORDER BY created_at DESC`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Employee Leave History Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee leave history.' } });
  }
}

/**
 * 14. Get Leave Ledger Transaction History for Active User
 */
export async function getLeaveLedger(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    // Ensure summary & initial ledger entries are computed
    await calculateEmployeeLeaveSummary(userId);

    const [rows]: any = await pool.query(
      `SELECT id, user_id as userId, leave_type as leaveType, transaction_date as transactionDate,
              transaction_type as transactionType, credit, debit, balance, remarks, created_at as createdAt
       FROM leave_ledger
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Leave Ledger Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave ledger.' } });
  }
}

/**
 * 15. Get Detailed CL Calculation Formula Breakdown
 */
export async function getCLCalculationDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = (req.params.userId && req.params.userId !== 'me') ? req.params.userId : req.user?.id;
    if (!targetUserId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const clResult = await calculateCL(targetUserId);

    res.json({
      success: true,
      formula: 'CL Entitlement = (Annual CL / 12) * (12 - Joining Financial Year Month)',
      data: clResult,
    });
  } catch (error: any) {
    logger.error('Get CL Calculation Details Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to calculate CL.' } });
  }
}

/**
 * 16. Get Detailed PL Calculation Formula Breakdown
 */
export async function getPLCalculationDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { doj, annualPL, eligibilityMonths, experienceYears, d5 } = req.query;

    const formulaString = 'IF(C5="","", IF(D5>3, IF(EDATE(C5,6)>DATE(2027,3,31), 0, ROUND((14/12)*(DATEDIF(MAX(EDATE(C5,6),DATE(2026,4,1)),DATE(2027,3,31),"m")+1),0)), IF(EDATE(C5,8)>DATE(2027,3,31), 0, ROUND((14/12)*(DATEDIF(MAX(EDATE(C5,8),DATE(2026,4,1)),DATE(2027,3,31),"m")+1),0))))';

    if (doj && typeof doj === 'string') {
      const annualPLNum = parseFloat(String(annualPL)) || 14.0;
      const expYearsNum = parseFloat(String(experienceYears || d5 || '0')) || 0;
      const eligibilityMonthsNum = eligibilityMonths ? parseInt(String(eligibilityMonths), 10) : (expYearsNum > 3 ? 6 : 8);
      const fy = getFinancialYear();
      const calcResult = calculatePLEntitlement(doj, expYearsNum, fy, annualPLNum, eligibilityMonthsNum);

      res.json({
        success: true,
        formula: formulaString,
        parameters: {
          doj,
          experienceYears: expYearsNum,
          annualPL: annualPLNum,
          eligibilityMonths: eligibilityMonthsNum,
          financialYear: fy,
        },
        data: calcResult,
      });
      return;
    }

    const targetUserId = (req.params.userId && req.params.userId !== 'me') ? req.params.userId : req.user?.id;
    if (!targetUserId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User authentication required.' } });
      return;
    }

    const plResult = await calculatePL(targetUserId);

    res.json({
      success: true,
      formula: formulaString,
      data: plResult,
    });
  } catch (error: any) {
    logger.error('Get PL Calculation Details Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to calculate PL.' } });
  }
}
