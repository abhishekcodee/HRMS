import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/index.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

export interface SecurityEventOptions {
  companyId?: string | null;
  actorUserId?: string | null;
  actorUserEmail?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Log an audit security event to the database and system log.
 */
export async function logSecurityEvent(opts: SecurityEventOptions): Promise<void> {
  try {
    const id = uuidv4();
    const metadataStr = opts.metadata ? JSON.stringify(opts.metadata) : null;
    
    await pool.query(
      `INSERT INTO security_audit_logs (
        id, company_id, actor_user_id, actor_user_email, actor_role,
        action, resource_type, resource_id, status, ip_address, user_agent, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        opts.companyId || null,
        opts.actorUserId || null,
        opts.actorUserEmail || null,
        opts.actorRole || null,
        opts.action,
        opts.resourceType,
        opts.resourceId || null,
        opts.status || 'SUCCESS',
        opts.ipAddress || null,
        opts.userAgent || null,
        metadataStr,
      ]
    );

    logger.info(`[SECURITY AUDIT] ${opts.action} - User: ${opts.actorUserEmail || 'ANONYMOUS'} - Status: ${opts.status || 'SUCCESS'}`);
  } catch (err: any) {
    logger.error('Failed to log security audit event:', err);
  }
}

/**
 * Helper to extract security options from Express AuthRequest.
 */
export function extractReqSecurityContext(req: AuthRequest) {
  const user = req.user;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const companyId = (user as any)?.companyId || (req.query?.company_id as string) || (req.body?.company_id as string) || null;

  return {
    companyId,
    actorUserId: user?.id || null,
    actorUserEmail: user?.email || null,
    actorRole: user?.role || null,
    ipAddress,
    userAgent,
  };
}
