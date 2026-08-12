import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `[${timestamp}] [${level}]: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss UTC' }),
    env.NODE_ENV === 'development' ? combine(colorize(), customFormat) : json()
  ),
  transports: [
    new winston.transports.Console()
  ],
});
