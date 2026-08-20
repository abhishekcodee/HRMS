import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';

// Default system settings fallback
const DEFAULT_SETTINGS = {
  companyName: 'Acme Enterprise Technologies Pvt Ltd',
  companyCode: 'ACME-IN',
  gstin: '29AAAAA0000A1Z5',
  corporateEmail: 'hr@company.com',
  address: '42 MG Road, Koramangala, Bengaluru, Karnataka - 560034',
  shiftStart: '09:00 AM',
  gracePeriod: '15',
  fullDayHours: '8',
  halfDayHours: '4',
  casualLeave: '10',
  sickLeave: '7',
  earnedLeave: '15',
  pfRate: '12',
  esiRate: '0.75',
  taxYearStart: 'April',
  emailAlerts: true,
  leaveAlerts: true,
  attendanceDigest: true,
  forceFirstPasswordChange: true,
  sessionTimeout: '60',
};

/**
 * GET /api/v1/settings
 * Fetch all system settings from MySQL database
 */
export async function getSettings(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch (_) {
        settings[row.setting_key] = row.setting_value;
      }
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve system settings.' },
    });
  }
}

/**
 * PUT /api/v1/settings
 * Update system settings in MySQL database
 */
export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const newSettings = req.body;
    if (!newSettings || typeof newSettings !== 'object') {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid settings payload.' },
      });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const [key, value] of Object.entries(newSettings)) {
        const valStr = JSON.stringify(value);
        await conn.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, valStr]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({
      success: true,
      message: 'System settings saved successfully.',
      data: newSettings,
    });
  } catch (error: any) {
    logger.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update system settings.' },
    });
  }
}
