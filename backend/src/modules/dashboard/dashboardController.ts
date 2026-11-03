import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    let empQuery = "SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND status = 'active'";
    let presentQuery = "SELECT COUNT(DISTINCT user_id) as count FROM attendance WHERE work_date = ? AND status = 'PRESENT'";
    let onLeaveQuery = "SELECT COUNT(DISTINCT user_id) as count FROM leave_requests WHERE ? BETWEEN start_date AND end_date AND status = 'APPROVED'";
    let pendingLeaveQuery = "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'PENDING'";
    let deptDistQuery = `
      SELECT COALESCE(ep.department_name, 'General') as department, COUNT(u.id) as count 
      FROM users u 
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id 
      WHERE u.role = 'employee' AND u.status = 'active'
    `;
    let pendingLeavesListQuery = `
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.days_count, lr.reason, lr.status, u.full_name, u.employee_id 
      FROM leave_requests lr 
      JOIN users u ON lr.user_id = u.id 
      WHERE lr.status = 'PENDING'
    `;

    const empParams: any[] = [];
    const presentParams: any[] = [todayStr];
    const onLeaveParams: any[] = [todayStr];
    const pendingLeaveParams: any[] = [];
    const deptParams: any[] = [];
    const pendingListParams: any[] = [];

    if (!isSuperGlobal) {
      empQuery += " AND company_id = ?";
      empParams.push(companyId);

      presentQuery += " AND company_id = ?";
      presentParams.push(companyId);

      onLeaveQuery += " AND company_id = ?";
      onLeaveParams.push(companyId);

      pendingLeaveQuery += " AND company_id = ?";
      pendingLeaveParams.push(companyId);

      deptDistQuery += " AND u.company_id = ?";
      deptParams.push(companyId);

      pendingLeavesListQuery += " AND lr.company_id = ?";
      pendingListParams.push(companyId);
    }

    deptDistQuery += " GROUP BY ep.department_name";
    pendingLeavesListQuery += " ORDER BY lr.created_at DESC LIMIT 5";

    // Run parallel high-speed aggregation queries
    const [
      [empCountRows],
      [presentRows],
      [leaveTodayRows],
      [pendingLeaveRows],
      [deptDistRows],
      [recentPendingRows]
    ]: any = await Promise.all([
      pool.query(empQuery, empParams),
      pool.query(presentQuery, presentParams),
      pool.query(onLeaveQuery, onLeaveParams),
      pool.query(pendingLeaveQuery, pendingLeaveParams),
      pool.query(deptDistQuery, deptParams),
      pool.query(pendingLeavesListQuery, pendingListParams)
    ]);

    const totalEmployees = empCountRows[0]?.count || 0;
    const presentToday = presentRows[0]?.count || 0;
    const onLeaveToday = leaveTodayRows[0]?.count || 0;
    const pendingLeaves = pendingLeaveRows[0]?.count || 0;
    const attendancePercentage = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          presentToday,
          onLeaveToday,
          pendingLeaves,
          attendancePercentage: `${attendancePercentage}%`,
        },
        departmentDistribution: deptDistRows || [],
        pendingLeaveRequests: recentPendingRows || [],
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve dashboard analytics.' },
    });
  }
}
