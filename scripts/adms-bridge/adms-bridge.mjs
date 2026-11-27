#!/usr/bin/env node
/**
 * ADMS bridge: lets an eSSL / ZKTeco attendance machine on the office network push punches to the
 * HRMS backend hosted in the cloud (Render).
 *
 * Why: older firmwares (e.g. eSSL X2008, firmware 6.x, push 2.x) can only send plain HTTP to an IP address,
 * while Render only serves HTTPS on a domain name. This program runs on an always-on office PC, accepts the
 * machine's plain HTTP requests and forwards them unchanged to the backend over HTTPS, then returns the
 * backend's answer to the machine.
 *
 *   machine (192.168.1.155)  --HTTP-->  this PC :8888  --HTTPS-->  https://<backend>/iclock/...
 *
 * If the backend cannot be reached, the machine gets "ERROR" and keeps the punches to resend later,
 * so nothing is lost while the internet or the backend is down.
 *
 * Usage:   node adms-bridge.mjs [--port 8888] [--target https://your-backend.onrender.com]
 * Env:     ADMS_BRIDGE_PORT, ADMS_BRIDGE_TARGET
 * Needs:   Node.js 18 or newer. No packages to install.
 */
import http from 'node:http';
import os from 'node:os';

const DEFAULT_TARGET = 'https://hrms-backend-dlez.onrender.com';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const PORT = Number(arg('port') || process.env.ADMS_BRIDGE_PORT || 8888);
const TARGET = String(arg('target') || process.env.ADMS_BRIDGE_TARGET || DEFAULT_TARGET).replace(/\/+$/, '');
// A cold-starting free Render service can take ~50 s to answer; machines usually wait about 30-60 s.
const UPSTREAM_TIMEOUT_MS = Number(process.env.ADMS_BRIDGE_TIMEOUT_MS || 55000);
const MAX_BODY_BYTES = 20 * 1024 * 1024;

if (!/^https?:\/\/[^/]+$/i.test(TARGET)) {
  console.error(`Invalid target "${TARGET}". Example: --target https://hrms-backend-dlez.onrender.com`);
  process.exit(1);
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`Invalid port "${PORT}".`);
  process.exit(1);
}

const stamp = () => new Date().toLocaleString();
const log = (...a) => console.log(`[${stamp()}]`, ...a);

/** Only the device protocol paths are forwarded; nothing else on the backend is reachable through the bridge. */
const DEVICE_PATH = /^\/iclock\/(?:cdata|getrequest|devicecmd|fdata|push|querydata|ping)(?:\.php|\.aspx)?\/?$/i;

function deviceIp(req) {
  return String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function reply(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

function describe(url) {
  const q = url.searchParams;
  const sn = q.get('SN') || q.get('sn') || '?';
  const table = q.get('table') || q.get('Table');
  return `SN=${sn}${table ? ` table=${table}` : ''}`;
}

let lastOkAt = 0;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://bridge.local');

  // Simple status page for a person opening http://<this-pc>:<port>/ in a browser
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/status')) {
    const ok = lastOkAt ? `last successful forward: ${new Date(lastOkAt).toLocaleString()}` : 'no device traffic forwarded yet';
    reply(res, 200, `HRMS ADMS bridge is running.\nForwarding to: ${TARGET}/iclock/...\n${ok}\n`);
    return;
  }

  if (!DEVICE_PATH.test(url.pathname)) {
    reply(res, 404, 'Not Found');
    return;
  }

  let body;
  try {
    body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
  } catch {
    reply(res, 413, 'ERROR');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const started = Date.now();
  try {
    const upstream = await fetch(`${TARGET}${url.pathname}${url.search}`, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'text/plain',
        'User-Agent': req.headers['user-agent'] || 'iClock Proxy',
        // Lets the backend show the machine's own LAN address
        'X-Forwarded-For': deviceIp(req),
      },
      body: body && body.length ? body : undefined,
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await upstream.text();
    lastOkAt = upstream.ok ? Date.now() : lastOkAt;
    log(`${req.method} ${url.pathname} ${describe(url)} -> ${upstream.status} ${text.split(/\r?\n/)[0].slice(0, 60)} (${Date.now() - started} ms)`);
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'text/plain',
      'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
  } catch (err) {
    const why = err?.name === 'AbortError' ? `no answer within ${UPSTREAM_TIMEOUT_MS / 1000}s` : err?.cause?.code || err?.message || err;
    log(`${req.method} ${url.pathname} ${describe(url)} -> backend unreachable (${why}); device will retry`);
    // Anything but OK makes the machine keep its punches and send them again later
    reply(res, 502, 'ERROR');
  } finally {
    clearTimeout(timer);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the other program using it (e.g. eTimeTrackLite) or start with --port <other>.`);
  } else {
    console.error('Bridge error:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
  log(`HRMS ADMS bridge listening on port ${PORT}, forwarding to ${TARGET}`);
  log(`Set the attendance machine's ADMS server to one of: ${ips.map((ip) => `${ip}:${PORT}`).join(', ') || `<this PC's IP>:${PORT}`}`);
});
