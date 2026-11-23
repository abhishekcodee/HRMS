/**
 * Pure helpers for the ZKTeco / eSSL "ADMS" (PUSH SDK) HTTP protocol.
 *
 * Supported devices include eSSL AiFace Mars / Mars+ / uFace / X990 / K-series and
 * ZKTeco SpeedFace, ProFace, MB-series terminals with "Cloud Server" (ADMS) enabled.
 *
 * Protocol summary:
 *   GET  /iclock/cdata?SN=..&options=all        -> handshake, server returns config block
 *   POST /iclock/cdata?SN=..&table=ATTLOG       -> attendance logs (tab separated lines)
 *   POST /iclock/cdata?SN=..&table=OPERLOG      -> users / templates / operation logs
 *   GET  /iclock/getrequest?SN=..               -> heartbeat; server returns pending commands or OK
 *   POST /iclock/devicecmd?SN=..                -> device reports results of executed commands
 *
 * Nothing in this file touches the database so it can be unit tested in isolation.
 */

export interface ParsedPunch {
  pin: string;
  /** Device local wall-clock time, normalised to `YYYY-MM-DD HH:MM:SS`. */
  punchTime: string;
  /** Raw status code from the device (0=Check-In, 1=Check-Out, 2=Break-Out, 3=Break-In, 4=OT-In, 5=OT-Out). */
  status: string;
  /** Raw verify code from the device (1=Fingerprint, 15=Face, ...). */
  verifyCode: string;
  workCode: string;
  raw: string;
}

export interface ParsedDeviceUser {
  pin: string;
  name: string;
  privilege: string;
  card: string;
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'CHECK_IN',
  '1': 'CHECK_OUT',
  '2': 'BREAK_OUT',
  '3': 'BREAK_IN',
  '4': 'OT_IN',
  '5': 'OT_OUT',
  '255': 'AUTO',
};

const VERIFY_LABELS: Record<string, string> = {
  '0': 'Password',
  '1': 'Fingerprint',
  '2': 'Card',
  '3': 'Password',
  '4': 'Card',
  '9': 'Face',
  '15': 'Face',
  '25': 'Palm',
  '200': 'Other',
};

export function statusLabel(code: string): string {
  return STATUS_LABELS[String(code).trim()] || 'AUTO';
}

export function verifyLabel(code: string): string {
  const c = String(code).trim();
  if (VERIFY_LABELS[c]) return VERIFY_LABELS[c];
  return c ? `Mode ${c}` : 'Unknown';
}

/**
 * Normalise a device timestamp to `YYYY-MM-DD HH:MM:SS` without any timezone conversion.
 * Devices send local wall-clock time; converting through `Date` on a UTC server would shift it.
 */
export function normaliseDeviceTime(value: string): string | null {
  const m = String(value || '')
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const pad = (v: string | undefined) => String(v ?? '0').padStart(2, '0');
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s ?? 0);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
}

/** Parse `key=value` pairs separated by tabs (used by OPERLOG and PUSH 3.x payloads). */
export function parseKeyValueLine(line: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of line.split('\t')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    out[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
  }
  return out;
}

/**
 * Parse an ATTLOG body.
 * Classic format (PUSH 2.x):  `PIN\tYYYY-MM-DD HH:MM:SS\tStatus\tVerify\tWorkcode\tReserved\tReserved`
 * Key/value format (3.x / querydata): `pin=1\ttime=2026-11-23 09:00:00\tstatus=0\tverify=15 ...`
 */
export function parseAttlog(body: string): ParsedPunch[] {
  const punches: ParsedPunch[] = [];
  const lines = String(body || '').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/^﻿/, '').trimEnd();
    if (!line.trim()) continue;

    let pin = '';
    let time = '';
    let status = '0';
    let verify = '';
    let workCode = '';

    if (/(^|\t)\s*(pin|time)\s*=/i.test(line)) {
      const kv = parseKeyValueLine(line.replace(/^\s*\w+\s+(?=\w+=)/, ''));
      pin = kv.pin || kv.userid || '';
      time = kv.time || kv.checktime || '';
      status = kv.status ?? kv.inoutstatus ?? '0';
      verify = kv.verify ?? kv.verifytype ?? '';
      workCode = kv.workcode ?? '';
    } else {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        pin = parts[0];
        time = parts[1];
        status = parts[2] ?? '0';
        verify = parts[3] ?? '';
        workCode = parts[4] ?? '';
      } else {
        // Some firmwares use single spaces: PIN YYYY-MM-DD HH:MM:SS STATUS VERIFY
        const sp = line.trim().split(/\s+/);
        if (sp.length >= 3) {
          pin = sp[0];
          time = `${sp[1]} ${sp[2]}`;
          status = sp[3] ?? '0';
          verify = sp[4] ?? '';
          workCode = sp[5] ?? '';
        }
      }
    }

    pin = String(pin).trim();
    const punchTime = normaliseDeviceTime(time);
    if (!pin || !punchTime) continue;
    // Reject obviously bogus PINs (OPERLOG lines accidentally routed here etc.)
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(pin)) continue;

    punches.push({
      pin,
      punchTime,
      status: String(status || '0').trim() || '0',
      verifyCode: String(verify || '').trim(),
      workCode: String(workCode || '').trim(),
      raw: line,
    });
  }

  return punches;
}

/** Extract `USER PIN=..\tName=..` lines from an OPERLOG / USERINFO body. */
export function parseOperlogUsers(body: string): ParsedDeviceUser[] {
  const users: ParsedDeviceUser[] = [];
  for (const rawLine of String(body || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const m = line.match(/^USER\s+(.*)$/i);
    if (!m) continue;
    const kv = parseKeyValueLine(m[1]);
    if (!kv.pin) continue;
    users.push({
      pin: kv.pin,
      name: kv.name || '',
      privilege: kv.pri || kv.privilege || '0',
      card: kv.card || '',
    });
  }
  return users;
}

/** Count non-empty lines; devices expect `OK: <n>` with the number of records accepted. */
export function countRecords(body: string): number {
  return String(body || '').split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}

export interface HandshakeOptions {
  sn: string;
  attlogStamp?: string | null;
  operlogStamp?: string | null;
  /** Seconds between heartbeats. */
  delay?: number;
}

/**
 * Build the configuration block returned to `GET /iclock/cdata?options=all`.
 * `Realtime=1` makes the device upload every punch immediately.
 */
export function buildHandshakeResponse(opts: HandshakeOptions): string {
  const lines = [
    `GET OPTION FROM: ${opts.sn}`,
    `ATTLOGStamp=${opts.attlogStamp || 'None'}`,
    `OPERLOGStamp=${opts.operlogStamp || 'None'}`,
    'ATTPHOTOStamp=None',
    'ErrorDelay=30',
    `Delay=${opts.delay ?? 10}`,
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=TransData AttLog OpLog EnrollUser ChgUser',
    'Realtime=1',
    'Encrypt=None',
    'ServerVer=2.4.1',
    'PushProtVer=2.4.1',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** Parse the `INFO=` query value sent with getrequest: `Ver,UserCount,FPCount,AttCount,IP,FPVer,...`. */
export function parseInfoParam(info: string | undefined): { firmware?: string; userCount?: number; attCount?: number; ip?: string } {
  if (!info) return {};
  const parts = String(info).split(',');
  const num = (v?: string) => (v !== undefined && /^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
  return {
    firmware: parts[0]?.trim() || undefined,
    userCount: num(parts[1]),
    attCount: num(parts[3]),
    ip: parts[4]?.trim() || undefined,
  };
}

/** Parse the body of POST /iclock/devicecmd: `ID=12&Return=0&CMD=DATA` (one per line). */
export function parseDeviceCmdResults(body: string): Array<{ id: string; returnCode: string; cmd: string }> {
  const results: Array<{ id: string; returnCode: string; cmd: string }> = [];
  for (const rawLine of String(body || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const params = new URLSearchParams(line);
    const id = params.get('ID') || params.get('id');
    if (!id) continue;
    results.push({ id, returnCode: params.get('Return') ?? '', cmd: params.get('CMD') ?? '' });
  }
  return results;
}

/** Extract the trailing number of an employee code: `AMPL-00007` -> 7. */
export function numericSuffix(code: string | null | undefined): number | null {
  const m = String(code || '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

/** Parse "09:00", "9:00 AM", "09:00:00" into minutes since midnight. */
export function parseClockToMinutes(value: string | null | undefined, fallback = 9 * 60): number {
  const m = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
  if (!m) return fallback;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return fallback;
  return h * 60 + min;
}
