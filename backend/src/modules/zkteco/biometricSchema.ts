import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Idempotent schema upgrades required by the eSSL / ZKTeco ADMS integration.
 * Every statement is safe to run repeatedly: failures (column already exists, etc.) are ignored.
 * Runs on server start (from seed) and lazily before the first device request.
 */
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS biometric_devices (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS biometric_punch_logs (
    id VARCHAR(36) PRIMARY KEY,
    device_sn VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    punch_time DATETIME NOT NULL,
    verify_type VARCHAR(50) DEFAULT 'Fingerprint',
    punch_state VARCHAR(20) DEFAULT '0',
    raw_payload TEXT,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS biometric_device_users (
    id VARCHAR(36) PRIMARY KEY,
    device_sn VARCHAR(100) NOT NULL,
    pin VARCHAR(50) NOT NULL,
    name VARCHAR(150),
    privilege VARCHAR(10),
    card VARCHAR(50),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bio_dev_user (device_sn, pin)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS biometric_device_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_sn VARCHAR(100) NOT NULL,
    command TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    return_code VARCHAR(20),
    created_by VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    completed_at DATETIME,
    INDEX idx_bio_cmd_dev_status (device_sn, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // biometric_devices extensions
  'ALTER TABLE biometric_devices ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE biometric_devices ADD COLUMN firmware VARCHAR(100) NULL',
  'ALTER TABLE biometric_devices ADD COLUMN attlog_stamp VARCHAR(50) NULL',
  'ALTER TABLE biometric_devices ADD COLUMN operlog_stamp VARCHAR(50) NULL',
  'ALTER TABLE biometric_devices ADD COLUMN user_count INT NULL',
  'ALTER TABLE biometric_devices ADD COLUMN att_count INT NULL',
  'ALTER TABLE biometric_devices ADD COLUMN last_punch_at DATETIME NULL',
  'CREATE INDEX idx_bio_dev_company ON biometric_devices (company_id)',

  // biometric_punch_logs extensions
  'ALTER TABLE biometric_punch_logs ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE biometric_punch_logs ADD COLUMN user_id VARCHAR(36) NULL',
  'CREATE INDEX idx_bio_punch_lookup ON biometric_punch_logs (device_sn, employee_id, punch_time)',
  'CREATE INDEX idx_bio_punch_user_time ON biometric_punch_logs (user_id, punch_time)',
  'CREATE INDEX idx_bio_punch_company_time ON biometric_punch_logs (company_id, punch_time)',

  // users: explicit device PIN mapping + tenant column used across the app
  'ALTER TABLE users ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE users ADD COLUMN biometric_pin VARCHAR(50) NULL',
  'CREATE INDEX idx_users_biometric_pin ON users (company_id, biometric_pin)',

  // attendance columns used by dashboard, payroll, mobile and reports
  'ALTER TABLE attendance ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE attendance ADD COLUMN late_minutes INT NOT NULL DEFAULT 0',
  'ALTER TABLE attendance ADD COLUMN overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0',
  'ALTER TABLE attendance ADD COLUMN source VARCHAR(30) NULL',
  'ALTER TABLE attendance ADD COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'CREATE INDEX idx_attendance_user_date ON attendance (user_id, work_date)',
];

let ensured: Promise<void> | null = null;

export async function runBiometricSchemaUpgrade(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    for (const sql of STATEMENTS) {
      try {
        await conn.query(sql);
      } catch (err: any) {
        // ER_DUP_FIELDNAME (1060), ER_DUP_KEYNAME (1061), table exists etc. are expected on re-runs.
        if (![1050, 1060, 1061, 1146].includes(err?.errno)) {
          logger.debug?.(`Biometric schema statement skipped: ${err?.message}`);
        }
      }
    }
  } finally {
    conn.release();
  }
}

/** Runs the upgrade once per process; later calls reuse the same promise. */
export function ensureBiometricSchema(): Promise<void> {
  if (!ensured) {
    ensured = runBiometricSchemaUpgrade().catch((err) => {
      ensured = null; // allow retry on the next request if the DB was unreachable
      logger.error('Biometric schema upgrade failed:', err);
    });
  }
  return ensured;
}
