import express from 'express';
import http from 'http';
import { admsDeviceRouter } from '../../routes/zkteco.routes.js';
import { logger } from '../../utils/logger.js';

/**
 * Optional second port that accepts only biometric device traffic (/iclock/...).
 *
 * eSSL / ZKTeco terminals are often configured with a fixed "ADMS Server" port such as 8888. Set ADMS_PORT=8888
 * and the backend also listens there, so the device can push punches without changing its settings, while the
 * main API keeps running on PORT. Nothing else (no login, no HR API) is reachable on this port.
 */
export function createAdmsApp() {
  const adms = express();
  adms.disable('x-powered-by');
  adms.set('trust proxy', true);
  adms.use('/iclock', admsDeviceRouter);
  // Some firmwares call the root or unknown paths while probing; answer like an ADMS server does.
  adms.use((_req, res) => res.status(404).type('text/plain').send('Not Found'));
  return adms;
}

export function startAdmsListener(port: number, mainPort: number): http.Server | null {
  if (!Number.isInteger(port) || port <= 0 || port > 65535 || port === mainPort) return null;
  const server = http.createServer(createAdmsApp());
  server.on('error', (err: any) => {
    logger.error(
      err?.code === 'EADDRINUSE'
        ? `ADMS device port ${port} is already in use. Stop the other program (e.g. eTimeTrackLite / ADMS service) or choose another ADMS_PORT.`
        : `ADMS device listener on port ${port} failed: ${err?.message || err}`
    );
  });
  server.listen(port, '0.0.0.0', () => {
    logger.info(`📟 Biometric device (ADMS) listener on port ${port}: set the device's ADMS server to this computer's IP and port ${port}.`);
  });
  return server;
}
