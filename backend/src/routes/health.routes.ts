import { Router, Request, Response } from 'express';
import { ApiResponse, HealthStatusData, ReadinessStatusData } from '@hrms/shared';
import { checkDatabaseHealth, lastDbError } from '../database/index.js';
import { env } from '../config/env.js';

const router = Router();
const startTime = Date.now();

/**
 * GET /api/v1/health
 * Simple Liveness Probe Endpoint
 */
router.get('/health', (_req: Request, res: Response<ApiResponse<HealthStatusData>>) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  const response: ApiResponse<HealthStatusData> = {
    success: true,
    message: 'HRMS Backend Service is live and operational.',
    data: {
      service: 'HRMS-Backend-API',
      status: 'UP',
      uptime,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  res.status(200).json(response);
});

/**
 * GET /api/v1/ready
 * Deep Readiness Probe Endpoint (checks PostgreSQL connection & memory status)
 */
router.get('/ready', async (_req: Request, res: Response<any>) => {
  const dbHealth = await checkDatabaseHealth();
  const memory = process.memoryUsage();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const isReady = dbHealth === 'CONNECTED';
  const statusCode = isReady ? 200 : 503;

  const response = {
    success: isReady,
    message: isReady
      ? 'HRMS Backend is fully ready to accept incoming traffic.'
      : `HRMS Backend readiness check degraded: ${lastDbError || 'Database connection unavailable.'}`,
    data: {
      service: 'HRMS-Backend-API',
      status: isReady ? 'UP' : 'DEGRADED',
      uptime,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      checks: {
        database: dbHealth,
        databaseError: lastDbError,
        memoryUsage: {
          rssMB: Math.round(memory.rss / (1024 * 1024)),
          heapTotalMB: Math.round(memory.heapTotal / (1024 * 1024)),
          heapUsedMB: Math.round(memory.heapUsed / (1024 * 1024)),
        },
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  res.status(statusCode).json(response);
});

export const healthRouter = router;
