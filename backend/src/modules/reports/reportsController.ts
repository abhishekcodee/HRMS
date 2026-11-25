import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';

interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  department?: string;
  designation?: string;
  location?: string;
  employmentType?: string;
  status?: string;
  gender?: string;
}

/**
 * Helper to build SQL WHERE clause conditions from filters
 */
function buildFilterConditions(filters: DateRangeFilter, dateColumn: string = 'created_at') {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];

  if (filters.startDate) {
    conditions.push(`${dateColumn} >= ?`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`${dateColumn} <= ?`);
    params.push(`${filters.endDate} 23:59:59`);
  }
  if (filters.department && filters.department !== 'ALL') {
    conditions.push(`ep.department_name = ?`);
    params.push(filters.department);
  }
  if (filters.designation && filters.designation !== 'ALL') {
    conditions.push(`ep.designation = ?`);
    params.push(filters.designation);
  }
  if (filters.location && filters.location !== 'ALL') {
    conditions.push(`ep.branch_name = ?`);
    params.push(filters.location);
  }
  if (filters.employmentType && filters.employmentType !== 'ALL') {
    conditions.push(`ep.employment_type = ?`);
    params.push(filters.employmentType);
  }
  if (filters.status && filters.status !== 'ALL') {
    conditions.push(`u.status = ?`);
    params.push(filters.status.toLowerCase());
  }
  if (filters.gender && filters.gender !== 'ALL') {
    conditions.push(`ep.gender = ?`);
    params.push(filters.gender);
  }

  return { whereSql: conditions.join(' AND '), params };
}

/**
 * 1. Overview KPIs
 */
export async function getReportsOverview(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const filters: DateRangeFilter = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      department: req.query.department as string,
      designation: req.query.designation as string,
      location: req.query.location as string,
      employmentType: req.query.employmentType as string,
      status: req.query.status as string,
      gender: req.query.gender as string,
    };

    const { whereSql, params } = buildFilterConditions(filters, 'u.created_at');

    // Total & Active & Inactive Employees
    const [empStats]: any = await conn.query(
      `SELECT 
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) as activeEmployees,
        SUM(CASE WHEN u.status != 'active' THEN 1 ELSE 0 END) as inactiveEmployees
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE ${whereSql}`,
      params
    );

    // New Hires in selected period
    let newHiresCond = `u.created_at IS NOT NULL`;
    const newHiresParams: any[] = [];
    if (filters.startDate) {
      newHiresCond += ` AND (ep.joining_date >= ? OR u.created_at >= ?)`;
      newHiresParams.push(filters.startDate, filters.startDate);
    }
    if (filters.endDate) {
      newHiresCond += ` AND (ep.joining_date <= ? OR u.created_at <= ?)`;
      newHiresParams.push(filters.endDate, `${filters.endDate} 23:59:59`);
    }

    const [newHiresRes]: any = await conn.query(
      `SELECT COUNT(*) as newHiresCount
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE ${newHiresCond}`,
      newHiresParams
    );

    // Attrition (Inactive/Terminated/Resigned users)
    const [attritionRes]: any = await conn.query(
      `SELECT COUNT(*) as attritionCount
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.status IN ('inactive', 'terminated', 'resigned')`
    );

    const totalCount = parseInt(empStats[0]?.totalEmployees || 0, 10);
    const activeCount = parseInt(empStats[0]?.activeEmployees || 0, 10);
    const inactiveCount = parseInt(empStats[0]?.inactiveEmployees || 0, 10);
    const newHiresCount = parseInt(newHiresRes[0]?.newHiresCount || 0, 10);
    const attritionCount = parseInt(attritionRes[0]?.attritionCount || 0, 10);
    const attritionRate = totalCount > 0 ? ((attritionCount / totalCount) * 100).toFixed(1) : '0.0';

    // Absenteeism Rate
    const [attRes]: any = await conn.query(
      `SELECT 
        COUNT(*) as totalPunches,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absentDays,
        SUM(CASE WHEN work_hours > 8 THEN (work_hours - 8) ELSE 0 END) as overtimeHours
       FROM attendance`
    );

    const totalWorkingDays = parseInt(attRes[0]?.totalPunches || 0, 10);
    const totalAbsentDays = parseInt(attRes[0]?.absentDays || 0, 10);
    const absenteeismRate = totalWorkingDays > 0 ? ((totalAbsentDays / totalWorkingDays) * 100).toFixed(1) : '0.0';
    const totalOvertimeHours = parseFloat(attRes[0]?.overtimeHours || 0).toFixed(1);

    // Payroll Summary (From employee_profiles salary)
    const [payrollRes]: any = await conn.query(
      `SELECT 
        SUM(ep.salary) as totalPayrollCost,
        AVG(ep.salary) as avgPayrollCost
       FROM users u
       JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.status = 'active'`
    );

    const totalPayrollCost = parseFloat(payrollRes[0]?.totalPayrollCost || 0);
    const avgPayrollCost = parseFloat(payrollRes[0]?.avgPayrollCost || 0);
    const totalOvertimeCost = (parseFloat(totalOvertimeHours) * (avgPayrollCost > 0 ? avgPayrollCost / 160 : 250)).toFixed(2);

    // Leave Utilization
    const [leaveRes]: any = await conn.query(
      `SELECT 
        SUM(allocated_days) as totalAllocated,
        SUM(used_days) as totalUsed
       FROM leave_balances`
    );

    const totalAllocatedDays = parseFloat(leaveRes[0]?.totalAllocated || 0);
    const totalUsedDays = parseFloat(leaveRes[0]?.totalUsed || 0);
    const leaveUtilizationRate = totalAllocatedDays > 0 ? ((totalUsedDays / totalAllocatedDays) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        totalEmployees: totalCount,
        activeEmployees: activeCount,
        inactiveEmployees: inactiveCount,
        newHires: newHiresCount,
        newHiresTrendPct: '',
        attritionCount,
        attritionRate: `${attritionRate}%`,
        attritionTrendPct: '',
        absenteeismRate: `${absenteeismRate}%`,
        totalAbsentDays,
        absenteeismTrendPct: '',
        headcountGrowthPct: '',
        totalPayrollCost,
        avgPayrollCost: Math.round(avgPayrollCost),
        payrollTrendPct: '',
        totalOvertimeHours: parseFloat(totalOvertimeHours),
        totalOvertimeCost: parseFloat(totalOvertimeCost),
        leaveUtilizedDays: totalUsedDays,
        leaveAllocatedDays: totalAllocatedDays,
        leaveUtilizationPct: `${leaveUtilizationRate}%`,
      },
    });
  } catch (error: any) {
    logger.error('Reports Overview API Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate overview analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 2. Headcount Analytics & Department Headcount Chart Data
 */
export async function getHeadcountAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // Monthly headcount trend for current year
    const [monthlyTrend]: any = await conn.query(
      `SELECT 
        DATE_FORMAT(u.created_at, '%b %Y') as monthLabel,
        DATE_FORMAT(u.created_at, '%Y-%m') as monthKey,
        COUNT(*) as count
       FROM users u
       GROUP BY monthKey, monthLabel
       ORDER BY monthKey ASC
       LIMIT 12`
    );

    // Department-wise headcount
    const [deptHeadcount]: any = await conn.query(
      `SELECT 
        COALESCE(ep.department_name, 'Unassigned') as department,
        COUNT(u.id) as headcount
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.status = 'active'
       GROUP BY ep.department_name
       ORDER BY headcount DESC`
    );

    res.json({
      success: true,
      data: {
        trend: monthlyTrend.map((row: any) => ({ month: row.monthLabel, count: parseInt(row.count, 10) })),
        departments: deptHeadcount.map((row: any) => ({ department: row.department, count: parseInt(row.headcount, 10) })),
      },
    });
  } catch (error: any) {
    logger.error('Headcount Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch headcount analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 3. New Hire Analytics
 */
export async function getNewHiresAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [byDept]: any = await conn.query(
      `SELECT 
        COALESCE(ep.department_name, 'Unassigned') as department,
        COUNT(u.id) as count
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE ep.joining_date IS NOT NULL OR u.created_at IS NOT NULL
       GROUP BY ep.department_name`
    );

    const [byEmpType]: any = await conn.query(
      `SELECT 
        COALESCE(ep.employment_type, 'Full-Time Permanent') as employmentType,
        COUNT(u.id) as count
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       GROUP BY ep.employment_type`
    );

    res.json({
      success: true,
      data: {
        byDepartment: byDept.map((r: any) => ({ name: r.department, count: parseInt(r.count, 10) })),
        byEmploymentType: byEmpType.map((r: any) => ({ name: r.employmentType, count: parseInt(r.count, 10) })),
      },
    });
  } catch (error: any) {
    logger.error('New Hires Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch new hires analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 4. Attrition Analytics
 */
export async function getAttritionAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [attritionDept]: any = await conn.query(
      `SELECT 
        COALESCE(ep.department_name, 'Unassigned') as department,
        COUNT(u.id) as count
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.status IN ('inactive', 'terminated', 'resigned')
       GROUP BY ep.department_name`
    );

    res.json({
      success: true,
      data: {
        totalLeft: attritionDept.reduce((acc: number, r: any) => acc + parseInt(r.count, 10), 0),
        byDepartment: attritionDept.map((r: any) => ({ department: r.department, count: parseInt(r.count, 10) })),
        // Exit reasons are not recorded yet, so none are reported (previously hard-coded sample values)
        exitReasons: [],
      },
    });
  } catch (error: any) {
    logger.error('Attrition Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch attrition analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 5. Absenteeism Analytics
 */
export async function getAbsenteeismAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [deptAbsence]: any = await conn.query(
      `SELECT 
        COALESCE(ep.department_name, 'Unassigned') as department,
        COUNT(a.id) as totalLogs,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absentCount
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       GROUP BY ep.department_name`
    );

    res.json({
      success: true,
      data: {
        byDepartment: deptAbsence.map((r: any) => {
          const total = parseInt(r.totalLogs, 10);
          const absent = parseInt(r.absentCount, 10);
          return {
            department: r.department,
            absentDays: absent,
            rate: total > 0 ? parseFloat(((absent / total) * 100).toFixed(1)) : 0,
          };
        }),
      },
    });
  } catch (error: any) {
    logger.error('Absenteeism Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch absenteeism analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 6. Department Analytics
 */
export async function getDepartmentAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [deptData]: any = await conn.query(
      `SELECT 
        d.name as departmentName,
        d.code as departmentCode,
        d.head_name as headName,
        COUNT(u.id) as headcount,
        COALESCE(SUM(ep.salary), 0) as totalPayroll,
        COALESCE(AVG(ep.salary), 0) as avgSalary
       FROM master_departments d
       LEFT JOIN employee_profiles ep ON ep.department_name = d.name
       LEFT JOIN users u ON u.id = ep.user_id AND u.status = 'active'
       GROUP BY d.id, d.name, d.code, d.head_name`
    );

    res.json({
      success: true,
      data: deptData.map((row: any) => ({
        departmentName: row.departmentName,
        departmentCode: row.departmentCode,
        headName: row.headName || 'Not Assigned',
        headcount: parseInt(row.headcount, 10),
        totalPayroll: parseFloat(row.totalPayroll),
        avgSalary: Math.round(parseFloat(row.avgSalary)),
      })),
    });
  } catch (error: any) {
    logger.error('Department Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch department analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 7. Diversity / Gender Analytics
 */
export async function getDiversityAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [genderRes]: any = await conn.query(
      `SELECT 
        COALESCE(ep.gender, 'Unspecified') as gender,
        COUNT(u.id) as count
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.status = 'active'
       GROUP BY ep.gender`
    );

    const total = genderRes.reduce((acc: number, r: any) => acc + parseInt(r.count, 10), 0);

    res.json({
      success: true,
      data: {
        total,
        distribution: genderRes.map((r: any) => {
          const c = parseInt(r.count, 10);
          return {
            gender: r.gender,
            count: c,
            percentage: total > 0 ? parseFloat(((c / total) * 100).toFixed(1)) : 0,
          };
        }),
      },
    });
  } catch (error: any) {
    logger.error('Diversity Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch diversity analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 8. Payroll Cost Analytics
 */
export async function getPayrollAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [deptPayroll]: any = await conn.query(
      `SELECT 
        COALESCE(ep.department_name, 'Unassigned') as department,
        SUM(ep.salary) as totalSalary,
        AVG(ep.salary) as avgSalary,
        COUNT(u.id) as employeeCount
       FROM users u
       JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.status = 'active'
       GROUP BY ep.department_name`
    );

    const totalPayroll = deptPayroll.reduce((acc: number, r: any) => acc + parseFloat(r.totalSalary || 0), 0);
    const totalEmp = deptPayroll.reduce((acc: number, r: any) => acc + parseInt(r.employeeCount || 0, 10), 0);

    res.json({
      success: true,
      data: {
        totalPayrollCost: totalPayroll,
        avgPayrollCostPerEmployee: totalEmp > 0 ? Math.round(totalPayroll / totalEmp) : 0,
        byDepartment: deptPayroll.map((r: any) => ({
          department: r.department,
          totalSalary: parseFloat(r.totalSalary),
          avgSalary: Math.round(parseFloat(r.avgSalary)),
          employeeCount: parseInt(r.employeeCount, 10),
        })),
      },
    });
  } catch (error: any) {
    logger.error('Payroll Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch payroll analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 9. Leave Utilization Analytics
 */
export async function getLeaveAnalytics(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const [leaveTypes]: any = await conn.query(
      `SELECT 
        leave_type as leaveType,
        SUM(allocated_days) as totalAllocated,
        SUM(used_days) as totalUsed
       FROM leave_balances
       GROUP BY leave_type`
    );

    res.json({
      success: true,
      data: {
        byType: leaveTypes.map((r: any) => {
          const alloc = parseFloat(r.totalAllocated || 0);
          const used = parseFloat(r.totalUsed || 0);
          return {
            leaveType: r.leaveType,
            allocated: alloc,
            used,
            remaining: Math.max(0, alloc - used),
            utilizationPct: alloc > 0 ? parseFloat(((used / alloc) * 100).toFixed(1)) : 0,
          };
        }),
      },
    });
  } catch (error: any) {
    logger.error('Leave Analytics Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave analytics.' } });
  } finally {
    conn.release();
  }
}

/**
 * 10. Recruitment Funnel & Time-to-Hire Analytics
 */
export async function getRecruitmentAnalytics(_req: AuthRequest, res: Response): Promise<void> {
  // Graceful response for recruitment metrics
  res.json({
    success: true,
    data: {
      // There is no recruitment module yet: report nothing instead of sample numbers
      funnel: [],
      conversionRate: '—',
      avgTimeToHireDays: 0,
      available: false,
    },
  });
}

/**
 * 11. Detailed Paginated Reports
 */
export async function getDetailedReport(req: AuthRequest, res: Response): Promise<void> {
  const conn = await pool.getConnection();
  try {
    const reportType = (req.query.type as string) || 'employee';
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || '').trim();
    const department = req.query.department as string;

    let whereClause = '1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (u.full_name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department && department !== 'ALL') {
      whereClause += ` AND ep.department_name = ?`;
      params.push(department);
    }

    if (reportType === 'employee') {
      const [countRes]: any = await conn.query(
        `SELECT COUNT(*) as total FROM users u LEFT JOIN employee_profiles ep ON ep.user_id = u.id WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countRes[0]?.total || 0, 10);

      const [rows]: any = await conn.query(
        `SELECT 
          u.employee_id as employeeId,
          u.full_name as fullName,
          u.email,
          u.phone,
          u.role,
          u.status,
          COALESCE(ep.department_name, 'Unassigned') as department,
          COALESCE(ep.designation, 'Staff') as designation,
          COALESCE(ep.branch_name, 'Corporate HQ') as location,
          COALESCE(ep.joining_date, DATE_FORMAT(u.created_at, '%Y-%m-%d')) as joiningDate
         FROM users u
         LEFT JOIN employee_profiles ep ON ep.user_id = u.id
         WHERE ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: rows,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
      return;
    }

    if (reportType === 'attendance') {
      const [countRes]: any = await conn.query(
        `SELECT COUNT(*) as total FROM attendance a JOIN users u ON u.id = a.user_id LEFT JOIN employee_profiles ep ON ep.user_id = u.id WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countRes[0]?.total || 0, 10);

      const [rows]: any = await conn.query(
        `SELECT 
          u.employee_id as employeeId,
          u.full_name as fullName,
          COALESCE(ep.department_name, 'Unassigned') as department,
          a.work_date as workDate,
          a.clock_in as clockIn,
          a.clock_out as clockOut,
          a.work_hours as workHours,
          a.status,
          a.notes
         FROM attendance a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN employee_profiles ep ON ep.user_id = u.id
         WHERE ${whereClause}
         ORDER BY a.work_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: rows,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
      return;
    }

    if (reportType === 'leave') {
      const [countRes]: any = await conn.query(
        `SELECT COUNT(*) as total FROM leave_requests lr JOIN users u ON u.id = lr.user_id LEFT JOIN employee_profiles ep ON ep.user_id = u.id WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countRes[0]?.total || 0, 10);

      const [rows]: any = await conn.query(
        `SELECT 
          u.employee_id as employeeId,
          u.full_name as fullName,
          COALESCE(ep.department_name, 'Unassigned') as department,
          lr.leave_type as leaveType,
          lr.start_date as startDate,
          lr.end_date as endDate,
          lr.days_count as daysCount,
          lr.status,
          lr.reason
         FROM leave_requests lr
         JOIN users u ON u.id = lr.user_id
         LEFT JOIN employee_profiles ep ON ep.user_id = u.id
         WHERE ${whereClause}
         ORDER BY lr.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: rows,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
      return;
    }

    if (reportType === 'payroll') {
      const [countRes]: any = await conn.query(
        `SELECT COUNT(*) as total FROM users u JOIN employee_profiles ep ON ep.user_id = u.id WHERE ${whereClause} AND u.status = 'active'`,
        params
      );

      const total = parseInt(countRes[0]?.total || 0, 10);

      const [rows]: any = await conn.query(
        `SELECT 
          u.employee_id as employeeId,
          u.full_name as fullName,
          COALESCE(ep.department_name, 'Unassigned') as department,
          COALESCE(ep.designation, 'Staff') as designation,
          ep.salary as grossSalary,
          ROUND(ep.salary * 0.85, 2) as netSalary,
          ROUND(ep.salary * 0.12, 2) as providentFund,
          ep.salary as totalCost
         FROM users u
         JOIN employee_profiles ep ON ep.user_id = u.id
         WHERE ${whereClause} AND u.status = 'active'
         ORDER BY ep.salary DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        success: true,
        data: rows,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
      return;
    }

    // Default fallback
    res.json({
      success: true,
      data: [],
      meta: { page: 1, limit, total: 0, totalPages: 0 },
    });
  } catch (error: any) {
    logger.error('Detailed Report Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch detailed report.' } });
  } finally {
    conn.release();
  }
}
