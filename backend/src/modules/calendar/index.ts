import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { authenticateToken, requireRole, AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';

const router = Router();
router.use(authenticateToken);

/**
 * Get All Calendar Events (Birthdays, Festival Holidays, Company Events, Approved Leaves)
 * Strictly Scoped to Authenticated Tenant Company
 */
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const year = (req.query.year as string) || '2026';
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    // 1. Fetch Company Events & Festival Holidays
    let eventsSql = `SELECT id, title, event_type as type, event_date as date, description, location FROM company_events`;
    const eventsParams: any[] = [];
    if (!isSuperGlobal) {
      eventsSql += ` WHERE company_id = ?`;
      eventsParams.push(companyId);
    }
    eventsSql += ` ORDER BY event_date ASC`;

    const [eventsRows]: any = await pool.query(eventsSql, eventsParams);

    const adaptedCompanyEvents = eventsRows.map((e: any) => {
      if (!e.date) return e;
      const parts = e.date.split('-');
      if (parts.length === 3 && e.type === 'FESTIVAL') {
        // Adapt annual festival to requested year (e.g. 2028)
        return {
          ...e,
          date: `${year}-${parts[1]}-${parts[2]}`,
        };
      }
      return e;
    });

    // 2. Fetch Employee Birthdays (Company Isolated)
    let bdaySql = `
      SELECT u.id, u.full_name as fullName, u.employee_id as employeeId, u.profile_photo as profilePhoto,
             ep.dob, ep.designation, ep.department_name as departmentName
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE ep.dob IS NOT NULL AND ep.dob != ''
    `;
    const bdayParams: any[] = [];
    if (!isSuperGlobal) {
      bdaySql += ` AND u.company_id = ?`;
      bdayParams.push(companyId);
    }

    const [birthdayRows]: any = await pool.query(bdaySql, bdayParams);

    const birthdayEvents = birthdayRows
      .map((b: any) => {
        if (!b.dob) return null;
        const dobParts = b.dob.split('-');
        if (dobParts.length !== 3) return null;
        const mmdd = `${dobParts[1]}-${dobParts[2]}`;
        const eventDate = `${year}-${mmdd}`;

        return {
          id: `bday-${b.id}`,
          title: `🎂 ${b.fullName}'s Birthday`,
          type: 'BIRTHDAY',
          date: eventDate,
          description: `Wish ${b.fullName} (${b.designation || 'Team Member'}, ${b.departmentName || 'HRMS'}) a Happy Birthday!`,
          location: 'Company Office',
          employeeName: b.fullName,
          employeeId: b.employeeId,
          profilePhoto: b.profilePhoto,
        };
      })
      .filter(Boolean);

    // 3. Fetch Approved Employee Leaves (Company Isolated)
    let leaveSql = `
      SELECT lr.id, lr.leave_type as leaveType, lr.start_date as startDate, lr.end_date as endDate,
             lr.days_count as daysCount, u.full_name as employeeName, u.profile_photo as profilePhoto
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
      WHERE lr.status = 'APPROVED'
    `;
    const leaveParams: any[] = [];
    if (!isSuperGlobal) {
      leaveSql += ` AND lr.company_id = ?`;
      leaveParams.push(companyId);
    }

    const [leaveRows]: any = await pool.query(leaveSql, leaveParams);

    const leaveEvents = leaveRows.map((l: any) => ({
      id: `leave-${l.id}`,
      title: `🌴 ${l.employeeName} (${l.leaveType})`,
      type: 'LEAVE',
      date: l.startDate,
      endDate: l.endDate,
      description: `${l.employeeName} is on approved ${l.leaveType} for ${l.daysCount} day(s) from ${l.startDate} to ${l.endDate}.`,
      location: 'Out of Office',
      employeeName: l.employeeName,
      profilePhoto: l.profilePhoto,
    }));

    // Combine all events
    const allEvents = [...adaptedCompanyEvents, ...birthdayEvents, ...leaveEvents];

    res.json({
      success: true,
      data: allEvents,
    });
  } catch (error) {
    console.error('Fetch Calendar Events Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch calendar events.' } });
  }
});

/**
 * Add New Company Event / Festival Holiday (Admin / Employer) - Tenant Isolated
 */
router.post('/events', requireRole(['admin', 'employer']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, date, description, location } = req.body;
    const companyId = getTenantId(req);

    if (!title || !type || !date) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title, Event Type, and Date are required.' } });
      return;
    }

    const eventId = uuidv4();
    await pool.query(
      `INSERT INTO company_events (id, company_id, title, event_type, event_date, description, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, companyId, title.trim(), type, date, description || null, location || null]
    );

    res.status(201).json({
      success: true,
      message: 'Event added successfully to company calendar.',
      data: { id: eventId, companyId, title, type, date, description, location },
    });
  } catch (error) {
    console.error('Add Calendar Event Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add calendar event.' } });
  }
});

export const calendarModule = {
  name: 'calendar',
  version: '1.0.0',
  router,
};
