import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import {
  sendMarketingDemoNotification,
  sendMarketingContactNotification,
} from '../../services/emailService.js';

let tablesInitialized = false;

export async function ensureMarketingTables() {
  if (tablesInitialized) return;
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS marketing_demo_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          work_email VARCHAR(255) NOT NULL,
          phone_number VARCHAR(50) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          company_size VARCHAR(100) NOT NULL,
          industry VARCHAR(100) NULL,
          designation VARCHAR(100) NULL,
          required_modules TEXT NULL,
          preferred_date VARCHAR(100) NULL,
          message TEXT NULL,
          status VARCHAR(50) DEFAULT 'NEW',
          ip_address VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS marketing_contact_inquiries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone_number VARCHAR(50) NULL,
          company_name VARCHAR(255) NULL,
          inquiry_type VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
          subject VARCHAR(255) NULL,
          message TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'NEW',
          ip_address VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS marketing_site_config (
          config_key VARCHAR(100) PRIMARY KEY,
          config_value JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      tablesInitialized = true;
      logger.info('Marketing database tables verified and ready.');
    } finally {
      conn.release();
    }
  } catch (err: any) {
    logger.warn('Could not auto-create marketing tables in MySQL:', err?.message || err);
  }
}

export async function submitDemoRequest(req: Request, res: Response) {
  try {
    await ensureMarketingTables();
    const {
      fullName,
      workEmail,
      phoneNumber,
      companyName,
      companySize,
      industry,
      designation,
      requiredModules,
      preferredDate,
      message,
    } = req.body;

    if (!fullName || !workEmail || !phoneNumber || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Work Email, Phone Number, and Company Name are required.',
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const modulesStr = Array.isArray(requiredModules) ? requiredModules.join(', ') : (requiredModules || '');

    const [result]: any = await pool.query(
      `INSERT INTO marketing_demo_requests 
        (full_name, work_email, phone_number, company_name, company_size, industry, designation, required_modules, preferred_date, message, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        workEmail,
        phoneNumber,
        companyName,
        companySize || '1-20',
        industry || 'Other',
        designation || '',
        modulesStr,
        preferredDate || null,
        message || '',
        String(ip),
      ]
    );

    logger.info('New Demo Request received:', { id: result.insertId, email: workEmail, company: companyName });

    // Send instant email notification to wokhman@gmail.com
    sendMarketingDemoNotification({
      id: result.insertId,
      fullName,
      workEmail,
      phoneNumber,
      companyName,
      companySize,
      industry,
      designation,
      requiredModules,
      preferredDate,
      message,
    }).catch((emailErr) => logger.warn('Failed to send demo email notification:', emailErr));

    // Generate cryptographically signed demo access grant token for the authorized visitor
    const demoAccessToken = jwt.sign(
      {
        type: 'DEMO_ACCESS_GRANT',
        authorized: true,
        email: workEmail,
        company: companyName,
        requestId: result.insertId,
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Demo request verified and approved. You now have authorized demo access!',
      data: {
        id: result.insertId,
        companyName,
        scheduledDate: preferredDate,
        demoAccessToken,
        demoUrl: `/login?demo_access=${encodeURIComponent(demoAccessToken)}`,
      },
    });
  } catch (error: any) {
    logger.error('Failed to submit demo request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record demo request. Please try again.',
      error: error?.message,
    });
  }
}

export async function submitContactInquiry(req: Request, res: Response) {
  try {
    await ensureMarketingTables();
    const { fullName, email, phoneNumber, companyName, inquiryType, subject, message } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email, and Message are required.',
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const [result]: any = await pool.query(
      `INSERT INTO marketing_contact_inquiries 
        (full_name, email, phone_number, company_name, inquiry_type, subject, message, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        phoneNumber || '',
        companyName || '',
        inquiryType || 'GENERAL',
        subject || 'General Inquiry',
        message,
        String(ip),
      ]
    );

    logger.info('New Contact Inquiry received:', { id: result.insertId, email, type: inquiryType });

    // Send instant email notification to wokhman@gmail.com
    sendMarketingContactNotification({
      id: result.insertId,
      fullName,
      email,
      phoneNumber,
      companyName,
      inquiryType,
      subject,
      message,
    }).catch((emailErr) => logger.warn('Failed to send contact email notification:', emailErr));

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been received. Our team will contact you shortly.',
      data: {
        id: result.insertId,
      },
    });
  } catch (error: any) {
    logger.error('Failed to submit contact inquiry:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record inquiry.',
      error: error?.message,
    });
  }
}

export async function getPricingPlans(req: Request, res: Response) {
  try {
    await ensureMarketingTables();
    const [rows]: any = await pool.query(
      `SELECT config_value FROM marketing_site_config WHERE config_key = 'pricing_plans'`
    );

    if (rows && rows.length > 0) {
      return res.json({ success: true, data: rows[0].config_value });
    }

    // Default enterprise pricing plans if not customized in db
    const defaultPricing = [
      {
        id: 'starter',
        name: 'Starter',
        tagline: 'Ideal for startups & small teams establishing core HR foundation',
        basePriceMonthly: 4999,
        basePriceAnnual: 3999,
        baseEmployees: 25,
        perExtraEmployeeMonthly: 60,
        perExtraEmployeeAnnual: 48,
        popular: false,
        features: [
          'Centralized Employee Master Records',
          'Web & Mobile GPS Attendance with Geo-Fencing',
          'Standard Leave Policies & Approval Hierarchy',
          'Document Locker for Employee Uploads',
          'Company Calendar & Holiday Lists',
          'Real-time Team Chat & Announcement Board',
          'Standard Email & Ticket Support (24h SLA)',
        ],
        modulesIncluded: ['Core HR', 'Attendance', 'Leave', 'Team Chat', 'Document Vault'],
      },
      {
        id: 'growth',
        name: 'Growth',
        tagline: 'Complete automated payroll, biometric sync & document generation for scaling companies',
        basePriceMonthly: 9999,
        basePriceAnnual: 7999,
        baseEmployees: 50,
        perExtraEmployeeMonthly: 90,
        perExtraEmployeeAnnual: 72,
        popular: true,
        features: [
          'Everything in Starter, plus:',
          'Automated Indian Statutory Payroll Engine (PF, ESIC, PT, TDS)',
          'Direct eSSL & ZKTeco Hardware Biometric ADMS Machine Push',
          'Automated HR Document Studio (Offer, Appointment, Relieving)',
          'Bank Transfer NEFT/RTGS File Generator',
          'Full & Final (F&F) Settlement Automation',
          'Bulk Payslip Generation & Password-Protected PDF Delivery',
          'Custom Salary Structures & Variable Allowance Formulas',
          'Priority Phone & Chat Support (4h SLA)',
        ],
        modulesIncluded: ['Core HR', 'Biometrics', 'Payroll', 'Statutory', 'Document Studio', 'ESS'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'Multi-entity corporate groups needing white-label branding, custom SLA & audit governance',
        basePriceMonthly: 19999,
        basePriceAnnual: 15999,
        baseEmployees: 100,
        perExtraEmployeeMonthly: 120,
        perExtraEmployeeAnnual: 96,
        popular: false,
        features: [
          'Everything in Growth, plus:',
          'Multi-Company & Entity Management with Unified Super Admin',
          'Complete White-Label Custom Branding & Letterhead Theming',
          'Enterprise Security & Audit Center with Granular RBAC',
          'Custom Statutory Formulas & Labor Code Rules',
          'Dedicated Customer Success Manager & Solution Architect',
          'Custom Integration Support (ERP, Tally, SAP, Oracle)',
          '99.9% Uptime Guarantee with Enterprise SLA',
        ],
        modulesIncluded: ['All Live Modules', 'Multi-Company', 'White-Label', 'Audit Center', 'Dedicated Support'],
      },
    ];

    return res.json({ success: true, data: defaultPricing });
  } catch (error: any) {
    logger.error('Failed to get pricing plans:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch pricing plans' });
  }
}

export async function getMarketingDemoRequests(req: Request, res: Response) {
  try {
    await ensureMarketingTables();
    const [rows]: any = await pool.query(
      `SELECT * FROM marketing_demo_requests ORDER BY created_at DESC LIMIT 100`
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
}

export async function getMarketingContactInquiries(req: Request, res: Response) {
  try {
    await ensureMarketingTables();
    const [rows]: any = await pool.query(
      `SELECT * FROM marketing_contact_inquiries ORDER BY created_at DESC LIMIT 100`
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
}

