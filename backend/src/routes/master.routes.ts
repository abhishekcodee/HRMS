import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getMasterDepartments,
  createMasterDepartment,
  updateMasterDepartment,
  deleteMasterDepartment,
  getMasterTeams,
  createMasterTeam,
  updateMasterTeam,
  deleteMasterTeam,
  getTeamMembers,
  getMasterDesignations,
  createMasterDesignation,
  getMasterBranches,
  getMasterShifts,
  getMasterEmploymentTypes,
} from '../modules/master/masterController.js';

export const masterRouter = Router();

// Master Data APIs are accessible to authenticated users
masterRouter.use(authenticateToken);

masterRouter.get('/departments', getMasterDepartments);
masterRouter.post('/departments', createMasterDepartment);
masterRouter.put('/departments/:id', updateMasterDepartment);
masterRouter.delete('/departments/:id', deleteMasterDepartment);

masterRouter.get('/teams', getMasterTeams);
masterRouter.post('/teams', createMasterTeam);
masterRouter.put('/teams/:id', updateMasterTeam);
masterRouter.delete('/teams/:id', deleteMasterTeam);
masterRouter.get('/teams/:teamId/members', getTeamMembers);

masterRouter.get('/designations', getMasterDesignations);
masterRouter.post('/designations', createMasterDesignation);

masterRouter.get('/branches', getMasterBranches);
masterRouter.get('/shifts', getMasterShifts);
masterRouter.get('/employment-types', getMasterEmploymentTypes);
