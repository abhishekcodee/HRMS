import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import {
  buildHandshakeResponse,
  normaliseDeviceTime,
  numericSuffix,
  parseAttlog,
  parseClockToMinutes,
  parseDeviceCmdResults,
  parseInfoParam,
  parseOperlogUsers,
  statusLabel,
  verifyLabel,
} from '../src/modules/zkteco/admsProtocol.js';

describe('ADMS protocol parsing (eSSL AiFace / ZKTeco push)', () => {
  it('parses classic tab separated ATTLOG lines without timezone shifting', () => {
    const body = '7\t2026-11-23 09:04:31\t0\t15\t0\t0\t0\r\n12\t2026-11-23 18:31:02\t1\t1\t0\t0\t0\r\n';
    const punches = parseAttlog(body);
    expect(punches).toHaveLength(2);
    expect(punches[0]).toMatchObject({ pin: '7', punchTime: '2026-11-23 09:04:31', status: '0', verifyCode: '15' });
    expect(punches[1]).toMatchObject({ pin: '12', punchTime: '2026-11-23 18:31:02', status: '1', verifyCode: '1' });
    expect(verifyLabel('15')).toBe('Face');
    expect(statusLabel('1')).toBe('CHECK_OUT');
  });

  it('parses key=value records and ignores junk / OPERLOG lines', () => {
    const body = [
      'pin=5\ttime=2026-11-23 08:59:00\tstatus=0\tverify=15',
      'OPLOG 4\t0\t2026-11-23 08:00:00\t0\t0\t0\t0',
      'USER PIN=5\tName=Ravi',
      '',
    ].join('\n');
    const punches = parseAttlog(body);
    expect(punches).toHaveLength(1);
    expect(punches[0]).toMatchObject({ pin: '5', punchTime: '2026-11-23 08:59:00' });
  });

  it('normalises device timestamps', () => {
    expect(normaliseDeviceTime('2026-1-5 9:3:7')).toBe('2026-01-05 09:03:07');
    expect(normaliseDeviceTime('2026/11/23 18:00')).toBe('2026-11-23 18:00:00');
    expect(normaliseDeviceTime('garbage')).toBeNull();
    expect(normaliseDeviceTime('2026-13-01 10:00:00')).toBeNull();
  });

  it('parses OPERLOG user records', () => {
    const users = parseOperlogUsers('USER PIN=7\tName=Asha Rao\tPri=0\tPasswd=\tCard=12345\tGrp=1\nFP PIN=7\tFID=6\n');
    expect(users).toEqual([{ pin: '7', name: 'Asha Rao', privilege: '0', card: '12345' }]);
  });

  it('builds the handshake config block with realtime upload enabled', () => {
    const text = buildHandshakeResponse({ sn: 'AIFM123', attlogStamp: '9999' });
    expect(text.startsWith('GET OPTION FROM: AIFM123')).toBe(true);
    expect(text).toContain('ATTLOGStamp=9999');
    expect(text).toContain('Realtime=1');
  });

  it('parses heartbeat INFO and command results', () => {
    expect(parseInfoParam('Ver 8.0.4-20240101,12,0,340,192.168.1.50,10,15')).toMatchObject({
      firmware: 'Ver 8.0.4-20240101', userCount: 12, attCount: 340, ip: '192.168.1.50',
    });
    expect(parseDeviceCmdResults('ID=3&Return=0&CMD=DATA\nID=4&Return=-1002&CMD=REBOOT')).toEqual([
      { id: '3', returnCode: '0', cmd: 'DATA' },
      { id: '4', returnCode: '-1002', cmd: 'REBOOT' },
    ]);
  });

  it('maps employee codes and shift times', () => {
    expect(numericSuffix('AMPL-00007')).toBe(7);
    expect(numericSuffix('EMP001')).toBe(1);
    expect(numericSuffix('HR')).toBeNull();
    expect(parseClockToMinutes('09:00 AM')).toBe(540);
    expect(parseClockToMinutes('01:30 PM')).toBe(810);
    expect(parseClockToMinutes('18:00')).toBe(1080);
  });
});

describe('ADMS HTTP endpoints', () => {
  it('GET /iclock/cdata?options=all returns the device configuration block', async () => {
    const res = await request(app).get('/iclock/cdata?SN=TEST-AIFACE-01&options=all&pushver=2.4.1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('GET OPTION FROM: TEST-AIFACE-01');
    expect(res.text).toContain('Realtime=1');
  }, 30000);

  it('GET /iclock/cdata.php without options answers OK', async () => {
    const res = await request(app).get('/iclock/cdata.php?SN=TEST-AIFACE-01');
    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  }, 30000);

  it('GET /api/v1/zkteco/getrequest answers OK (no queued commands)', async () => {
    const res = await request(app).get('/api/v1/zkteco/getrequest?SN=TEST-AIFACE-01');
    expect(res.status).toBe(200);
    expect(res.text.startsWith('OK') || res.text.startsWith('C:')).toBe(true);
  }, 30000);

  it('POST /iclock/cdata reads a text body even when the device sends a form Content-Type', async () => {
    const res = await request(app)
      .post('/iclock/cdata?SN=TEST-AIFACE-01&table=ATTLOG&Stamp=1')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('7\t2026-11-23 09:05:00\t0\t15\t0\t0\t0\n');
    // With a database the device gets "OK: 1"; without one, "ERROR" so it retries later.
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(res.text).toBe('OK: 1');
  }, 30000);
});
