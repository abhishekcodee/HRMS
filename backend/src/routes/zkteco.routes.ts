import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  cdataGET,
  cdataPOST,
  getBiometricDevices,
  registerBiometricDevice,
  getRawBiometricLogs,
  simulateBiometricPunch,
} from '../modules/zkteco/zktecoController.js';

export const zktecoRouter = Router();

// Hardware Unauthenticated Endpoints for eSSL / ZKTeco Machine ADMS PUSH Protocol
zktecoRouter.get('/cdata.php', cdataGET);
zktecoRouter.post('/cdata.php', cdataPOST);
zktecoRouter.get('/cdata', cdataGET);
zktecoRouter.post('/push', cdataPOST);

// Protected Admin / Employer Management Endpoints
zktecoRouter.get('/devices', authenticateToken, requireRole(['admin', 'employer']), getBiometricDevices);
zktecoRouter.post('/devices', authenticateToken, requireRole(['admin', 'employer']), registerBiometricDevice);
zktecoRouter.get('/raw-logs', authenticateToken, requireRole(['admin', 'employer']), getRawBiometricLogs);
zktecoRouter.post('/simulate-punch', authenticateToken, requireRole(['admin', 'employer']), simulateBiometricPunch);
