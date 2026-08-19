import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { employeeRouter } from './employee.routes.js';
import { authModule } from '../modules/auth/index.js';
import { usersModule } from '../modules/users/index.js';
import { rolesModule } from '../modules/roles/index.js';
import { permissionsModule } from '../modules/permissions/index.js';
import { organizationModule } from '../modules/organization/index.js';
import { employeesModule } from '../modules/employees/index.js';
import { attendanceModule } from '../modules/attendance/index.js';
import { zktecoModule } from '../modules/zkteco/index.js';
import { leaveModule } from '../modules/leave/index.js';
import { documentsModule } from '../modules/documents/index.js';
import { notificationsModule } from '../modules/notifications/index.js';
import { reportsModule } from '../modules/reports/index.js';
import { auditModule } from '../modules/audit/index.js';
import { calendarModule } from '../modules/calendar/index.js';
import { masterRouter } from './master.routes.js';
import { payrollRouter } from './payroll.routes.js';
import { zktecoRouter } from './zkteco.routes.js';

export const v1Router = Router();

// Health & Readiness Routes
v1Router.use('/', healthRouter);

// Employee Self Service Isolated Routes
v1Router.use('/employee', employeeRouter);

// Module Boundaries Mount Points
v1Router.use('/auth', authModule.router);
v1Router.use('/users', usersModule.router);
v1Router.use('/roles', rolesModule.router);
v1Router.use('/permissions', permissionsModule.router);
v1Router.use('/organization', organizationModule.router);
v1Router.use('/employees', employeesModule.router);
v1Router.use('/master', masterRouter);
v1Router.use('/attendance', attendanceModule.router);
v1Router.use('/zkteco', zktecoRouter);
v1Router.use('/essl', zktecoRouter);
v1Router.use('/leave', leaveModule.router);
v1Router.use('/payroll', payrollRouter);
v1Router.use('/documents', documentsModule.router);
v1Router.use('/notifications', notificationsModule.router);
v1Router.use('/reports', reportsModule.router);
v1Router.use('/audit', auditModule.router);
v1Router.use('/calendar', calendarModule.router);
