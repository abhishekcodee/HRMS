import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

/**
 * System Notifications Entity
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // LEAVE, ATTENDANCE, PAYROLL, DOCUMENT, SYSTEM
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    dataReference: text('data_reference'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notif_user_read').on(table.userId, table.readAt),
  ]
);

/**
 * Append-Only Security & Audit Trail Table
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // e.g. EMPLOYEE_CREATED, LEAVE_APPROVED
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    oldValuesJson: text('old_values_json'),
    newValuesJson: text('new_values_json'),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_actor').on(table.actorUserId),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_created').on(table.createdAt),
  ]
);
