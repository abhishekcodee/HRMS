import { pgTable, uuid, varchar, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { company } from './organization';
import { employees } from './employees';

/**
 * Biometric Terminal Devices
 */
export const biometricDevices = pgTable('biometric_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => company.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 100 }).notNull(),
  deviceCode: varchar('device_code', { length: 50 }).notNull().unique(),
  serialNumber: varchar('serial_number', { length: 100 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 50 }),
  port: integer('port'),
  location: varchar('location', { length: 255 }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Employee to Biometric Terminal User ID Mappings
 */
export const employeeBiometricMappings = pgTable(
  'employee_biometric_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id').notNull().references(() => biometricDevices.id, { onDelete: 'cascade' }),
    biometricUserId: varchar('biometric_user_id', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_bio_map_dev_user').on(table.deviceId, table.biometricUserId),
  ]
);

/**
 * Immutable Raw Biometric Punch Logs
 */
export const attendanceRawLogs = pgTable(
  'attendance_raw_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: uuid('device_id').notNull().references(() => biometricDevices.id, { onDelete: 'restrict' }),
    biometricUserId: varchar('biometric_user_id', { length: 50 }).notNull(),
    punchTime: timestamp('punch_time', { withTimezone: true }).notNull(),
    punchType: varchar('punch_type', { length: 20 }), // CHECK_IN, CHECK_OUT, UNKNOWN
    rawEventId: varchar('raw_event_id', { length: 100 }),
    rawPayload: text('raw_payload'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    source: varchar('source', { length: 50 }).notNull().default('ZKTECO_PUSH'), // ZKTECO_PUSH, POLLING, FILE_IMPORT
    processingStatus: varchar('processing_status', { length: 20 }).notNull().default('UNPROCESSED'), // UNPROCESSED, PROCESSED, ERROR, IGNORED
    processedAt: timestamp('processed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_raw_log_dev_user_punch').on(table.deviceId, table.biometricUserId, table.punchTime),
    index('idx_raw_log_proc_status').on(table.processingStatus),
    index('idx_raw_log_punch_time').on(table.punchTime),
  ]
);
