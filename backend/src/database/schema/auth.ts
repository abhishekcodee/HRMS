import { pgTable, uuid, varchar, text, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';

/**
 * Users Table - Application Login Identity
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * System RBAC Roles Table
 */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(), // ADMIN, HR, MANAGER, EMPLOYEE
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Granular Permissions Table
 */
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(), // e.g. employee.view, attendance.view_all
  module: varchar('module', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Role-Permission Mapping Join Table
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ]
);

/**
 * User-Role Mapping Join Table
 */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
  ]
);
