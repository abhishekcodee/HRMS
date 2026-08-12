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
        profile_photo TEXT,
        last_login_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS employee_profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        department_name VARCHAR(100),
        designation VARCHAR(100),
        joining_date VARCHAR(20),
        salary DECIMAL(12,2),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        pay_period VARCHAR(50) NOT NULL,
        basic_salary DECIMAL(12,2) NOT NULL,
        allowances DECIMAL(12,2) NOT NULL,
        deductions DECIMAL(12,2) NOT NULL,
        net_salary DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DISBURSED',
        disbursed_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

    // Ensure columns exist if table was created previously
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE users ADD COLUMN password_changed_at DATETIME;`);
    } catch (_) {}

    logger.info('✅ MySQL Tables created/verified.');

    // 2. Seed Distinct Individual Test Accounts
    const defaultAccounts = [
      {
        employeeId: 'ADM001',
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
        employeeId: 'EMPLOYER001',
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
      const [existingUsers]: any = await conn.query(
        'SELECT id FROM users WHERE email = ? OR employee_id = ?',
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
          `UPDATE users SET must_change_password = ?, password_hash = ? WHERE id = ?`,
          [acc.mustChangePassword, passwordHash, userId]
        );
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

        // Leave records
        const [existingLeave]: any = await conn.query('SELECT id FROM leave_requests WHERE user_id = ?', [userId]);
        if (existingLeave.length === 0) {
          await conn.query(
            `INSERT INTO leave_requests (id, user_id, leave_type, start_date, end_date, days_count, reason, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              userId,
              'Casual Leave',
              '2026-08-20',
              '2026-08-21',
              2,
              `Personal leave request for ${acc.fullName}`,
              acc.employeeId === 'EMP001' ? 'APPROVED' : 'PENDING',
            ]
          );
        }

        // Payroll records
        const [existingPayroll]: any = await conn.query('SELECT id FROM payroll_records WHERE user_id = ?', [userId]);
        if (existingPayroll.length === 0) {
          await conn.query(
            `INSERT INTO payroll_records (id, user_id, pay_period, basic_salary, allowances, deductions, net_salary, status, disbursed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              uuidv4(),
              userId,
              'July 2026',
              acc.basicSalary,
              acc.allowances,
              acc.deductions,
              acc.salary,
              'DISBURSED',
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
