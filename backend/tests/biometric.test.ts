import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('eSSL & ZKTeco Biometric Machine ADMS Integration', () => {
  it('GET /iclock/cdata.php - should accept eSSL device heartbeat and return text OK', async () => {
    const res = await request(app).get('/iclock/cdata.php?SN=ESSL-X990-TEST-99');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('GET /api/v1/zkteco/cdata - should accept API alias device heartbeat ping', async () => {
    const res = await request(app).get('/api/v1/zkteco/cdata?SN=ESSL-K30-TEST-88');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });

  it('POST /iclock/cdata.php - should ingest eSSL biometric punch and return OK count', async () => {
    const punchPayload = 'EMP001\t2026-08-13 09:05:00\t0\t1';
    const res = await request(app)
      .post('/iclock/cdata.php?SN=ESSL-X990-TEST-99')
      .set('Content-Type', 'text/plain')
      .send(punchPayload);

    expect(res.status).toBe(200);
    expect(res.text).toContain('OK');
  });
});
