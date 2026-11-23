import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  cdataGET,
  cdataPOST,
  getRequest,
  deviceCmd,
  pingDevice,
  getBiometricDevices,
  registerBiometricDevice,
  deleteBiometricDevice,
  testDeviceConnection,
  getRawBiometricLogs,
  simulateBiometricPunch,
  getPinMappings,
  setPinMapping,
  queueDeviceCommand,
  reprocessPunches,
  getServerInfo,
} from '../modules/zkteco/zktecoController.js';

/**
 * Devices post plain text (often with a wrong or missing Content-Type), so every device
 * endpoint reads the body as text regardless of headers.
 */
const deviceBody = express.text({ type: () => true, limit: '20mb' });

/**
 * ADMS / PUSH endpoints called by the eSSL / ZKTeco terminal. Unauthenticated by design:
 * the hardware cannot send JWTs. Punches from a serial number are only applied to
 * attendance after an admin registers that serial number to a company.
 */
export const admsDeviceRouter = Router();

for (const base of ['/cdata', '/cdata.php', '/cdata.aspx']) {
  admsDeviceRouter.get(base, cdataGET);
  admsDeviceRouter.post(base, deviceBody, cdataPOST);
}
for (const base of ['/getrequest', '/getrequest.php', '/getrequest.aspx']) {
  admsDeviceRouter.get(base, getRequest);
}
for (const base of ['/devicecmd', '/devicecmd.php', '/devicecmd.aspx']) {
  admsDeviceRouter.post(base, deviceBody, deviceCmd);
}
for (const base of ['/fdata', '/fdata.php', '/fdata.aspx', '/push', '/querydata']) {
  admsDeviceRouter.post(base, deviceBody, cdataPOST);
}
admsDeviceRouter.get('/ping', pingDevice);

/** Paths handled by the device router; global JSON/urlencoded parsers must skip these. */
export const ADMS_PATH_PATTERN = /^\/(?:iclock|api\/v1\/(?:zkteco|essl))\/(?:cdata|getrequest|devicecmd|fdata|push|querydata|ping)(?:\.php|\.aspx)?\/?$/i;

/** Authenticated management API mounted at /api/v1/zkteco (and /api/v1/essl). */
export const zktecoRouter = Router();
const admin = [authenticateToken, requireRole(['admin', 'employer'])];

zktecoRouter.use(admsDeviceRouter);
zktecoRouter.get('/server-info', ...admin, getServerInfo);
zktecoRouter.get('/devices', ...admin, getBiometricDevices);
zktecoRouter.post('/devices', ...admin, registerBiometricDevice);
zktecoRouter.delete('/devices/:id', ...admin, deleteBiometricDevice);
zktecoRouter.post('/devices/:id/commands', ...admin, queueDeviceCommand);
zktecoRouter.post('/test-connection', ...admin, testDeviceConnection);
zktecoRouter.get('/raw-logs', authenticateToken, getRawBiometricLogs);
zktecoRouter.get('/pin-mappings', ...admin, getPinMappings);
zktecoRouter.put('/pin-mappings', ...admin, setPinMapping);
zktecoRouter.post('/reprocess', ...admin, reprocessPunches);
zktecoRouter.post('/simulate-punch', ...admin, simulateBiometricPunch);
