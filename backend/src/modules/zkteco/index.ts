import { Router } from 'express';

/**
 * ZKTeco Biometric Module Boundary
 * Responsibilities: Ingestion & storage of raw biometric machine punch logs, device status tracking.
 * Raw biometric logs are preserved separately from processed attendance.
 */
export const zktecoModule = {
  name: 'zkteco',
  version: '1.0.0',
  router: Router(),
};
