import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';

describe('HRMS Backend Health & Readiness API Integration', () => {
  it('should advertise the Vite web development origin on port 8080 in the default CORS list', () => {
    expect(env.CORS_ORIGIN.split(',')).toContain('http://localhost:8080');
  });

  it('GET /api/v1/health - should return 200 with valid HealthStatusData payload', async () => {
    const res = await request(app).get('/api/v1/health');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('HRMS-Backend-API');
    expect(res.body.data.status).toBe('UP');
    expect(res.body.meta.version).toBe('v1');
  });

  it('GET /api/v1/ready - should return 200 or 503 with ReadinessStatusData structure', async () => {
    const res = await request(app).get('/api/v1/ready');
    
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
    expect(res.body.data).toHaveProperty('checks');
    expect(res.body.data.checks).toHaveProperty('database');
    expect(res.body.data.checks).toHaveProperty('memoryUsage');
  });

  it('GET /api/v1/non-existent-route - should return centralized 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NOT_FOUND');
    expect(res.body).toHaveProperty('timestamp');
  });
});
