import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool, checkDatabaseHealth } from './index.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase() {
  logger.info('Initializing MySQL HRMS database tables & seeding isolated data...');

  const health = await checkDatabaseHealth();
  if (health === 'DISCONNECTED') {
    logger.warn('Skipping seeding: MySQL database is unreachable.');
    return;
  }

  const conn = await pool.getConnection();
  try {
    // 1. Create Tables
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        must_change_password TINYINT(1) NOT NULL DEFAULT 1,
        password_changed_at DATETIME,
        profile_photo LONGTEXT,
        last_login_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Master Tables
    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_departments (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_designations (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department_id VARCHAR(36),
        department_name VARCHAR(100),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_branches (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_shifts (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_employment_types (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS employee_profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        department_name VARCHAR(100),
        designation VARCHAR(100),
        branch_name VARCHAR(100),
        shift_name VARCHAR(100),
        employment_type VARCHAR(50),
        joining_date VARCHAR(20),
        salary DECIMAL(12,2),
        gender VARCHAR(20),
        dob VARCHAR(20),
        address TEXT,
        emergency_contact VARCHAR(255),
        emergency_phone VARCHAR(50),
        manager_id VARCHAR(36),
        manager_name VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist on employee_profiles if previously created
    const extraCols = [
      'ALTER TABLE employee_profiles ADD COLUMN branch_name VARCHAR(100);',
      'ALTER TABLE employee_profiles ADD COLUMN shift_name VARCHAR(100);',
      'ALTER TABLE employee_profiles ADD COLUMN employment_type VARCHAR(50);',
      'ALTER TABLE employee_profiles ADD COLUMN gender VARCHAR(20);',
      'ALTER TABLE employee_profiles ADD COLUMN dob VARCHAR(20);',
      'ALTER TABLE employee_profiles ADD COLUMN address TEXT;',
      'ALTER TABLE employee_profiles ADD COLUMN emergency_contact VARCHAR(255);',
      'ALTER TABLE employee_profiles ADD COLUMN emergency_phone VARCHAR(50);',
      'ALTER TABLE employee_profiles ADD COLUMN manager_id VARCHAR(36);',
      'ALTER TABLE employee_profiles ADD COLUMN manager_name VARCHAR(255);',
    ];
    for (const sql of extraCols) {
      try { await conn.query(sql); } catch (_) {}
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS employer_profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        company_name VARCHAR(255),
        tax_id VARCHAR(100),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        work_date VARCHAR(20) NOT NULL,
        clock_in VARCHAR(20),
        clock_out VARCHAR(20),
        work_hours DECIMAL(5,2),
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date VARCHAR(20) NOT NULL,
        end_date VARCHAR(20) NOT NULL,
        days_count INT NOT NULL,
        reason TEXT,
        attachment TEXT,
        employer_id VARCHAR(36),
        employer_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        employer_action_by VARCHAR(255),
        employer_action_at DATETIME,
        employer_rejection_reason TEXT,
        admin_id VARCHAR(36),
        admin_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        admin_action_by VARCHAR(255),
        admin_action_at DATETIME,
        admin_rejection_reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        allocated_days DECIMAL(5,2) NOT NULL DEFAULT 12.00,
        used_days DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_user_leave (user_id, leave_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS employee_documents (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        file_url TEXT,
        file_size VARCHAR(50),
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    await conn.query(`
      CREATE TABLE IF NOT EXISTS company_events (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_date VARCHAR(20) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        user_email VARCHAR(255),
        role VARCHAR(20),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(50),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50),
        leave_request_id VARCHAR(36),
        recipient_email VARCHAR(255) NOT NULL,
        email_type VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        sent_at DATETIME,
        error_message TEXT,
        retry_count INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS salary_slip_email_logs (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        employee_email VARCHAR(255) NOT NULL,
        salary_month VARCHAR(20) NOT NULL,
        salary_year VARCHAR(10) NOT NULL,
        salary_slip_file VARCHAR(555),
        email_subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        sent_at DATETIME,
        error_message TEXT,
        retry_count INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_emp_month_year (employee_id, salary_month, salary_year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS leave_audit_trail (
        id VARCHAR(36) PRIMARY KEY,
        leave_request_id VARCHAR(36) NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        previous_status VARCHAR(20),
        new_status VARCHAR(20) NOT NULL,
        action_by VARCHAR(255) NOT NULL,
        action_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        ip_address VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS biometric_devices (
        id VARCHAR(36) PRIMARY KEY,
        device_sn VARCHAR(100) NOT NULL UNIQUE,
        device_name VARCHAR(150) NOT NULL,
        ip_address VARCHAR(50),
        port INT DEFAULT 4370,
        location VARCHAR(150),
        status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
        last_ping_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS biometric_punch_logs (
        id VARCHAR(36) PRIMARY KEY,
        device_sn VARCHAR(100) NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        punch_time DATETIME NOT NULL,
        verify_type VARCHAR(50) DEFAULT 'Fingerprint',
        punch_state VARCHAR(20) DEFAULT '0',
        raw_payload TEXT,
        processed TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_teams (
        id VARCHAR(36) PRIMARY KEY,
        department_id VARCHAR(36) NOT NULL,
        department_name VARCHAR(100),
        name VARCHAR(100) NOT NULL,
        leader_name VARCHAR(100),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await conn.query(`ALTER TABLE master_departments ADD COLUMN head_name VARCHAR(100);`);
    } catch (_) {}

    // Seed default eSSL / ZKTeco device if table empty
    const [bioDevs]: any = await conn.query('SELECT COUNT(*) as count FROM biometric_devices');
    if (bioDevs[0].count === 0) {
      await conn.query(`INSERT INTO biometric_devices (id, device_sn, device_name, ip_address, port, location, status, last_ping_at) VALUES
        (UUID(), 'ESSL-X990-BLR-01', 'Main Entrance eSSL X990 Biometric Scanner', '192.168.1.201', 4370, 'Bengaluru HQ Gate 1', 'ONLINE', NOW()),
        (UUID(), 'ESSL-K30-MUM-02', 'Lobby eSSL K30 Attendance Punch Terminal', '192.168.2.105', 4370, 'Mumbai Office Reception', 'ONLINE', NOW());`);
    }

    // Ensure columns exist if table was created previously
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN password_changed_at DATETIME;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN rejection_remarks TEXT;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN reviewed_by VARCHAR(36);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN reviewed_at DATETIME;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN attachment TEXT;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN employer_id VARCHAR(36);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN employer_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN employer_action_by VARCHAR(255);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN employer_action_at DATETIME;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN employer_rejection_reason TEXT;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN admin_id VARCHAR(36);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN admin_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN admin_action_by VARCHAR(255);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN admin_action_at DATETIME;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE leave_requests ADD COLUMN admin_rejection_reason TEXT;`);
    } catch (_) {}

    logger.info('✅ MySQL Tables created/verified.');

    const [depts]: any = await conn.query('SELECT COUNT(*) as count FROM master_departments');
    if (depts[0].count === 0) {
      await conn.query(`INSERT INTO master_departments (id, name, code, head_name, description) VALUES
        (UUID(), 'Information Technology', 'IT', 'Aman Upadhyay', 'Core software development, infrastructure, QA and IT support'),
        (UUID(), 'Human Resources', 'HR', 'Priya Sharma', 'Talent acquisition, employee relations, and HR policies'),
        (UUID(), 'Finance & Accounts', 'FIN', 'Rajesh Kumar', 'Corporate accounting, tax compliance, and auditing'),
        (UUID(), 'Sales & Business', 'SLS', 'Ananya Iyer', 'Enterprise business development and client relations'),
        (UUID(), 'Operations & Logistics', 'OPS', 'Vikram Singh', 'Facilities management and operational planning');`);
    }

    const [teamsCount]: any = await conn.query('SELECT COUNT(*) as count FROM master_teams');
    if (teamsCount[0].count === 0) {
      const [itDepts]: any = await conn.query('SELECT id FROM master_departments WHERE code = "IT"');
      const [hrDepts]: any = await conn.query('SELECT id FROM master_departments WHERE code = "HR"');
      const [finDepts]: any = await conn.query('SELECT id FROM master_departments WHERE code = "FIN"');
      const itId = itDepts.length > 0 ? itDepts[0].id : 'dept-it';
      const hrId = hrDepts.length > 0 ? hrDepts[0].id : 'dept-hr';
      const finId = finDepts.length > 0 ? finDepts[0].id : 'dept-fin';

      await conn.query(`INSERT INTO master_teams (id, department_id, department_name, name, leader_name) VALUES
        (UUID(), ?, 'Information Technology', 'Core Engineering & Architecture', 'Aman Upadhyay'),
        (UUID(), ?, 'Information Technology', 'QA & Test Automation', 'Anand Verma'),
        (UUID(), ?, 'Human Resources', 'Talent Acquisition & Onboarding', 'Priya Sharma'),
        (UUID(), ?, 'Finance & Accounts', 'Payroll & Auditing', 'Rajesh Kumar');`, [itId, itId, hrId, finId]);
    }

    const [desigs]: any = await conn.query('SELECT COUNT(*) as count FROM master_designations');
    if (desigs[0].count === 0) {
      await conn.query(`INSERT INTO master_designations (id, name, department_name) VALUES
        (UUID(), 'Senior Software Engineer', 'Information Technology'),
        (UUID(), 'Frontend UI/UX Specialist', 'Information Technology'),
        (UUID(), 'QA Automation Engineer', 'Information Technology'),
        (UUID(), 'Talent Acquisition Lead', 'Human Resources'),
        (UUID(), 'Senior Financial Analyst', 'Finance & Accounts'),
        (UUID(), 'Director of HR & Operations', 'Human Resources'),
        (UUID(), 'Chief System Administrator', 'Management');`);
    }

    const [branches]: any = await conn.query('SELECT COUNT(*) as count FROM master_branches');
    if (branches[0].count === 0) {
      await conn.query(`INSERT INTO master_branches (id, name, code, city, state, country) VALUES
        (UUID(), 'Corporate Headquarters', 'HQ-BLR', 'Bengaluru', 'Karnataka', 'India'),
        (UUID(), 'Regional Operations Centre', 'ROC-MUM', 'Mumbai', 'Maharashtra', 'India'),
        (UUID(), 'Tech Innovation Lab', 'TIL-HYD', 'Hyderabad', 'Telangana', 'India');`);
    }

    const [shifts]: any = await conn.query('SELECT COUNT(*) as count FROM master_shifts');
    if (shifts[0].count === 0) {
      await conn.query(`INSERT INTO master_shifts (id, name, start_time, end_time) VALUES
        (UUID(), 'General Day Shift', '09:00 AM', '06:00 PM'),
        (UUID(), 'Morning Shift', '07:00 AM', '04:00 PM'),
        (UUID(), 'Evening Support Shift', '02:00 PM', '11:00 PM');`);
    }

    const [eventsCount]: any = await conn.query('SELECT COUNT(*) as count FROM company_events');
    if (eventsCount[0].count === 0) {
      await conn.query(`INSERT INTO company_events (id, title, event_type, event_date, description, location) VALUES
        (UUID(), 'New Year\\'s Day', 'FESTIVAL', '2026-01-01', 'Official Public Holiday for New Year 2026', 'All Branches'),
        (UUID(), 'Republic Day', 'FESTIVAL', '2026-01-26', 'National Holiday celebrating Constitution Day of India', 'All Branches'),
        (UUID(), 'Maha Shivratri', 'FESTIVAL', '2026-02-15', 'Festive Holiday', 'All Branches'),
        (UUID(), 'Holi - Festival of Colors', 'FESTIVAL', '2026-03-04', 'Spring Festival & Holiday', 'All Branches'),
        (UUID(), 'Good Friday', 'FESTIVAL', '2026-04-03', 'Public Holiday', 'All Branches'),
        (UUID(), 'Dr. Ambedkar Jayanti', 'FESTIVAL', '2026-04-14', 'Public Holiday', 'All Branches'),
        (UUID(), 'May Day / Labor Day', 'FESTIVAL', '2026-05-01', 'International Workers Day', 'All Branches'),
        (UUID(), 'Independence Day', 'FESTIVAL', '2026-08-15', 'National Holiday celebrating Indian Independence', 'All Branches'),
        (UUID(), 'Ganesh Chaturthi', 'FESTIVAL', '2026-09-14', 'Festive Holiday', 'All Branches'),
        (UUID(), 'Mahatma Gandhi Jayanti', 'FESTIVAL', '2026-10-02', 'National Holiday celebrating Gandhi Jayanti', 'All Branches'),
        (UUID(), 'Dussehra / Vijayadashami', 'FESTIVAL', '2026-10-20', 'Festive Holiday', 'All Branches'),
        (UUID(), 'Diwali / Deepavali', 'FESTIVAL', '2026-11-08', 'Festival of Lights - Main Holiday', 'All Branches'),
        (UUID(), 'Christmas Day', 'FESTIVAL', '2026-12-25', 'Public Holiday celebrating Christmas', 'All Branches'),
        (UUID(), 'Q1 Town Hall & Strategy Session', 'EVENT', '2026-01-15', 'All-hands Quarterly Company Briefing', 'Main Auditorium & Zoom'),
        (UUID(), 'Annual Tech Hackathon 2026', 'EVENT', '2026-04-20', '24-hour Enterprise Product Hackathon & Demos', 'Tech Lab HQ'),
        (UUID(), 'Independence Day Cultural Gala', 'EVENT', '2026-08-14', 'Employee Performance & Evening Celebration', 'Cafeteria & Amphitheatre'),
        (UUID(), 'Diwali Celebration Party & Dinner', 'EVENT', '2026-11-06', 'Traditional Wear, Festivities & Dinner', 'Grand Ballroom');`);
    }

    const [empTypes]: any = await conn.query('SELECT COUNT(*) as count FROM master_employment_types');
    if (empTypes[0].count === 0) {
      await conn.query(`INSERT INTO master_employment_types (id, name, code) VALUES
        (UUID(), 'Full-Time Permanent', 'FT'),
        (UUID(), 'Probationary Employee', 'PROB'),
        (UUID(), 'Contractual Specialist', 'CONT'),
        (UUID(), 'Internship', 'INT');`);
    }

    // 2. Seed Distinct Individual Test Accounts
    const defaultAccounts = [
      {
        employeeId: 'ADMIN001',
        fullName: 'Chief System Administrator',
        email: 'admin@hrms.com',
        phone: '+91 98765 00001',
        passwordRaw: 'Admin@123',
        role: 'admin',
        status: 'active',
        mustChangePassword: 0,
        department: 'Management',
        designation: 'Chief Administrator',
      },
      {
        employeeId: 'ER001',
        fullName: 'Enterprise Employer Officer',
        email: 'employer@hrms.com',
        phone: '+91 98765 00002',
        passwordRaw: 'Employer@123',
        role: 'employer',
        status: 'active',
        mustChangePassword: 0,
        department: 'Executive Board',
        designation: 'Director of HR & Operations',
      },
      {
        employeeId: 'EMP001',
        fullName: 'Aarav Patel',
        email: 'employee1@hrms.com',
        phone: '+91 98765 10001',
        passwordRaw: 'Employee1@123',
        role: 'employee',
        status: 'active',
        mustChangePassword: 1, // First-time password change required
        department: 'Software Engineering',
        designation: 'Senior Full Stack Engineer',
        salary: '90000.00',
        basicSalary: '75000.00',
        allowances: '25000.00',
        deductions: '10000.00',
        docTitle: 'Employment Offer Letter & Contract (EMP001)',
      },
      {
        employeeId: 'EMP002',
        fullName: 'Priya Sharma',
        email: 'employee2@hrms.com',
        phone: '+91 98765 10002',
        passwordRaw: 'Employee2@123',
        role: 'employee',
        status: 'active',
        mustChangePassword: 0,
        department: 'Human Resources',
        designation: 'Talent Acquisition Lead',
        salary: '72000.00',
        basicSalary: '60000.00',
        allowances: '20000.00',
        deductions: '8000.00',
        docTitle: 'Form 16 Tax Certificate 2025-26 (EMP002)',
      },
      {
        employeeId: 'EMP003',
        fullName: 'Rajesh Kumar',
        email: 'employee3@hrms.com',
        phone: '+91 98765 10003',
        passwordRaw: 'Employee3@123',
        role: 'employee',
        status: 'active',
        mustChangePassword: 0,
        department: 'Finance & Accounts',
        designation: 'Senior Financial Analyst',
        salary: '98000.00',
        basicSalary: '80000.00',
        allowances: '30000.00',
        deductions: '12000.00',
        docTitle: 'Annual Performance Review & Increment (EMP003)',
      },
    ];

    for (const acc of defaultAccounts) {
      // First remove any stale user record having matching email or employee_id that doesn't match both
      await conn.query(
        'DELETE FROM users WHERE (email = ? OR employee_id = ?) AND NOT (email = ? AND employee_id = ?)',
        [acc.email, acc.employeeId, acc.email, acc.employeeId]
      );

      const [existingUsers]: any = await conn.query(
        'SELECT id FROM users WHERE email = ? AND employee_id = ?',
        [acc.email, acc.employeeId]
      );

      let userId: string;

      if (existingUsers.length === 0) {
        userId = uuidv4();
        const passwordHash = await bcrypt.hash(acc.passwordRaw, 10);

        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, phone, password_hash, role, status, must_change_password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            acc.employeeId,
            acc.fullName,
            acc.email,
            acc.phone,
            passwordHash,
            acc.role,
            acc.status,
            acc.mustChangePassword,
          ]
        );

        logger.info(`Seeded user: ${acc.employeeId} (${acc.email}) as ${acc.role}`);
      } else {
        userId = existingUsers[0].id;
        const passwordHash = await bcrypt.hash(acc.passwordRaw, 10);
        await conn.query(
          `UPDATE users SET full_name = ?, phone = ?, password_hash = ?, role = ?, status = ?, must_change_password = ? WHERE id = ?`,
          [acc.fullName, acc.phone, passwordHash, acc.role, acc.status, acc.mustChangePassword, userId]
        );
        logger.info(`Updated user: ${acc.employeeId} (${acc.email}) as ${acc.role}`);
      }

      if (acc.role === 'employee') {
        // Employee Profile
        const [existingProfiles]: any = await conn.query('SELECT id FROM employee_profiles WHERE user_id = ?', [userId]);
        if (existingProfiles.length === 0) {
          await conn.query(
            `INSERT INTO employee_profiles (id, user_id, department_name, designation, joining_date, salary)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, acc.department, acc.designation, '2024-01-15', acc.salary]
          );
        }

        // Attendance records
        const [existingAttendance]: any = await conn.query('SELECT id FROM attendance WHERE user_id = ?', [userId]);
        if (existingAttendance.length === 0) {
          await conn.query(
            `INSERT INTO attendance (id, user_id, work_date, clock_in, clock_out, work_hours, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, '2026-08-11', '09:00 AM', '06:00 PM', 9.00, 'PRESENT', 'Biometric ZKTeco auto-log']
          );
          await conn.query(
            `INSERT INTO attendance (id, user_id, work_date, clock_in, clock_out, work_hours, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, '2026-08-10', '09:10 AM', '06:05 PM', 8.90, 'PRESENT', 'On-time punch']
          );
        }

        // Leave balances initialization
        const [existingBal]: any = await conn.query('SELECT id FROM leave_balances WHERE user_id = ?', [userId]);
        if (existingBal.length === 0) {
          await conn.query(
            `INSERT INTO leave_balances (id, user_id, leave_type, allocated_days, used_days) VALUES
             (UUID(), ?, 'Casual Leave', 12.00, 0.00),
             (UUID(), ?, 'Sick Leave', 10.00, 0.00),
             (UUID(), ?, 'Earned Leave', 15.00, 0.00)`,
            [userId, userId, userId]
          );
        }

        // Leave records
        const [existingLeave]: any = await conn.query('SELECT id FROM leave_requests WHERE user_id = ?', [userId]);
        if (existingLeave.length === 0) {
          const initStatus = acc.employeeId === 'EMP001' ? 'APPROVED' : 'PENDING';
          await conn.query(
            `INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, days_count, reason, status, employer_status, admin_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              userId,
              'Casual Leave',
              '2026-08-20',
              '2026-08-21',
              2,
              `Personal leave request for ${acc.fullName}`,
              initStatus,
              initStatus,
              initStatus,
            ]
          );
        }

        // Documents
        const [existingDocs]: any = await conn.query('SELECT id FROM employee_documents WHERE user_id = ?', [userId]);
        if (existingDocs.length === 0) {
          await conn.query(
            `INSERT INTO employee_documents (id, user_id, title, document_type, file_url, file_size)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              userId,
              acc.docTitle,
              'PDF Agreement',
              `/documents/${acc.employeeId}_contract.pdf`,
              '1.4 MB',
            ]
          );
        }
      }
    }

    logger.info('✅ HRMS MySQL database seeding with isolated employee data completed.');
  } catch (error) {
    logger.error('Error during database seed execution:', error);
    throw error;
  } finally {
    conn.release();
  }
}

if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Database seeding failed:', err);
      await pool.end();
      process.exit(1);
    });
}
