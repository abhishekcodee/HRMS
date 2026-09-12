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
  createMasterBranch,
  getMasterShifts,
  createMasterShift,
  getMasterEmploymentTypes,
  getMasterGrades,
  createMasterGrade,
  deleteMasterGrade,
  getMasterCostCenters,
  createMasterCostCenter,
  deleteMasterCostCenter,
} from '../modules/master/masterController.js';

export const masterRouter = Router();

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
masterRouter.post('/branches', createMasterBranch);

masterRouter.get('/shifts', getMasterShifts);
masterRouter.post('/shifts', createMasterShift);

masterRouter.get('/employment-types', getMasterEmploymentTypes);

masterRouter.get('/grades', getMasterGrades);
masterRouter.post('/grades', createMasterGrade);
masterRouter.delete('/grades/:id', deleteMasterGrade);

masterRouter.get('/cost-centers', getMasterCostCenters);
masterRouter.post('/cost-centers', createMasterCostCenter);
masterRouter.delete('/cost-centers/:id', deleteMasterCostCenter);
