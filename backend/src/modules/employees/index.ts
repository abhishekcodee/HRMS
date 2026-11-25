import { Router } from 'express';
import { NextFunction, Response } from 'express';
import { AuthRequest, authenticateToken } from '../../middleware/authMiddleware.js';
import { SELF_EDITABLE_FIELDS, isHr, isSelf, requireHr } from '../../security/accessControl.js';
import {
  listEmployees,
  getEmployeeById,
  getNextEmployeeId,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  getEmployeeAttendanceById,
  sendEmployeeInvite,
} from './employeeCrudController.js';

const router = Router();

function selfOrHr(req: AuthRequest, res: Response, next: NextFunction): void {
  if (isHr(req) || isSelf(req, req.params.id)) return next();
  res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own attendance.' } });
}

/** HR may update any employee; an employee may only change personal fields on their own record. */
function hrOrSelfLimitedUpdate(req: AuthRequest, res: Response, next: NextFunction): void {
  if (isHr(req)) return next();
  if (!isSelf(req, req.params.id)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR can edit other employees.' } });
    return;
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  req.body = Object.fromEntries(Object.entries(body).filter(([k]) => SELF_EDITABLE_FIELDS.includes(k)));
  next();
}
router.use(authenticateToken);

// Reads: HR sees everything; employees see a directory without private fields (redacted in the controller)
router.get('/', listEmployees);
router.get('/next-id', requireHr, getNextEmployeeId);
router.get('/:id', getEmployeeById);
router.get('/:id/attendance', selfOrHr, getEmployeeAttendanceById);
// Writes: HR only, except an employee updating the personal fields of their own profile
router.post('/', requireHr, createEmployee);
router.put('/:id', hrOrSelfLimitedUpdate, updateEmployee);
router.patch('/:id/status', requireHr, updateEmployeeStatus);
router.post('/:id/send-invite', requireHr, sendEmployeeInvite);

/**
 * Employees Module Boundary
 * Responsibilities: Employee master data, employment details, reporting structure.
 */
export const employeesModule = {
  name: 'employees',
  version: '1.0.0',
  router,
};
