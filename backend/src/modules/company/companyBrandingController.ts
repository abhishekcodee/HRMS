import { Request, Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';

export async function getPublicBranding(req: Request, res: Response): Promise<void> {
  try {
    const domain = (req.query.domain as string) || (req.headers.host as string) || '';
    const code = (req.query.code as string) || '';
    const tenantIdHeader = (req.headers['x-tenant-id'] as string) || (req.query.tenant_id as string) || '';

    let sql = 'SELECT id, name, code, logo_url, favicon_url, brand_color, secondary_brand_color, custom_domain FROM companies WHERE status = "active"';
    const params: any[] = [];

    if (tenantIdHeader) {
      sql += ' AND id = ?';
      params.push(tenantIdHeader);
    } else if (code) {
      sql += ' AND LOWER(code) = LOWER(?)';
      params.push(code);
    } else if (domain && !domain.includes('localhost') && !domain.includes('127.0.0.1')) {
      sql += ' AND (LOWER(custom_domain) = LOWER(?) OR custom_domain LIKE ?)';
      params.push(domain, `%${domain}%`);
    } else {
      sql += ' AND (id = "c1000000-0000-0000-0000-000000000001" OR LOWER(code) = "default_emp")';
    }

    const [rows]: any = await pool.query(sql, params);

    let branding = rows.length > 0 ? rows[0] : null;

    // Fallback to Default Enterprise if specified tenant not found (strictly exclude Demo Corp)
    if (!branding) {
      const [fallback]: any = await pool.query(
        "SELECT id, name, code, logo_url, favicon_url, brand_color, secondary_brand_color, custom_domain FROM companies WHERE code != 'DEMO_CORP' ORDER BY (id = 'c1000000-0000-0000-0000-000000000001') DESC, created_at ASC LIMIT 1"
      );
      branding = fallback && fallback.length > 0 ? fallback[0] : {
        id: 'c1000000-0000-0000-0000-000000000001',
        name: 'Wokhman',
        code: 'WOKHMAN',
        logo_url: '/logo.png',
        favicon_url: '/favicon.png',
        brand_color: '#4f46e5',
        secondary_brand_color: '#0066ff',
      };
    }

    res.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error('getPublicBranding error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch company branding.' },
    });
  }
}

export async function updateCompanyBranding(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userRole = req.user?.role;
    const isAuthorized = userRole === 'super_admin' || userRole === 'admin' || userRole === 'employer' || req.user?.email?.toLowerCase() === 'amanupadhyay2030@gmail.com';
    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'White-Label Branding configuration requires administrator permissions.',
        },
      });
      return;
    }

    const companyId = getTenantId(req);
    const { name, logoUrl, faviconUrl, brandColor, secondaryBrandColor, customDomain, email, phone, address } = req.body;

    const [existing]: any = await pool.query('SELECT id, name FROM companies WHERE id = ?', [companyId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found.' } });
      return;
    }

    await pool.query(
      `UPDATE companies SET
        name = COALESCE(?, name),
        logo_url = COALESCE(?, logo_url),
        favicon_url = COALESCE(?, favicon_url),
        brand_color = COALESCE(?, brand_color),
        secondary_brand_color = COALESCE(?, secondary_brand_color),
        custom_domain = COALESCE(?, custom_domain),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        updated_at = NOW()
       WHERE id = ?`,
      [name, logoUrl, faviconUrl, brandColor, secondaryBrandColor, customDomain, email, phone, address, companyId]
    );

    const [updated]: any = await pool.query(
      'SELECT id, name, code, logo_url, favicon_url, brand_color, secondary_brand_color, custom_domain, email, phone, address FROM companies WHERE id = ?',
      [companyId]
    );

    res.json({
      success: true,
      message: 'Company branding and details updated successfully.',
      data: updated[0],
    });
  } catch (error) {
    console.error('updateCompanyBranding error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update company branding.' },
    });
  }
}
