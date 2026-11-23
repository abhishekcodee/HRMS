#!/usr/bin/env node
/**
 * ADMS office relay (optional)
 * ----------------------------
 * Use this ONLY if your eSSL / ZKTeco terminal cannot talk HTTPS to the cloud backend
 * (e.g. the Cloud Server menu has no "HTTPS" switch, or the device shows "Server not connected"
 * while the HRMS backend only accepts HTTPS, as on Render).
 *
 * Run it on any always-on Windows/Linux PC or Raspberry Pi in the same office network:
 *
 *     node scripts/adms-relay.mjs --target https://hrms-backend-dlez.onrender.com --port 8081
 *
 * Then on the device: Server Address = <this PC's LAN IP>, Server Port = 8081, Domain Name OFF, HTTPS OFF.
 * The relay forwards /iclock/* to the backend over HTTPS and returns the backend's answer unchanged.
 * No dependencies required (Node.js 18+).
 */
import http from 'node:http';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith('--') ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), [])
);
const TARGET = (args.target || process.env.ADMS_TARGET || 'https://hrms-backend-dlez.onrender.com').replace(/\/+$/, '');
const PORT = Number(args.port || process.env.ADMS_RELAY_PORT || 8081);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://relay');
  if (!url.pathname.toLowerCase().startsWith('/iclock/')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not an ADMS path');
    return;
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const deviceIp = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');

  try {
    const upstream = await fetch(`${TARGET}${url.pathname}${url.search}`, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'text/plain',
        'X-Forwarded-For': deviceIp,
        'User-Agent': req.headers['user-agent'] || 'adms-relay',
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      signal: AbortSignal.timeout(60000), // free hosting tiers can take ~50s to wake up
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'text/plain' }).end(text);
    console.log(`${new Date().toISOString()} ${deviceIp} ${req.method} ${url.pathname}?${url.searchParams.get('table') || ''} -> ${upstream.status} ${text.split(/\r?\n/)[0].slice(0, 60)}`);
  } catch (err) {
    // A non-OK answer makes the device keep its data and retry later.
    res.writeHead(502, { 'Content-Type': 'text/plain' }).end('ERROR');
    console.error(`${new Date().toISOString()} relay error for ${req.method} ${url.pathname}: ${err.message}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ADMS relay listening on http://0.0.0.0:${PORT}/iclock/ -> ${TARGET}`);
  console.log('Configure the device: Server Address = this PC\'s LAN IP, Server Port =', PORT, ', HTTPS OFF');
});
