import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root if available, or local backend dir
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.union([z.string(), z.number()]).transform((val) => (typeof val === 'number' ? val : parseInt(val, 10))).default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:8080'),
  
  // Database Configuration (MySQL / Localhost)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.union([z.string(), z.number()]).transform((val) => (typeof val === 'number' ? val : parseInt(val, 10))).default('3306'),
  DB_NAME: z.string().default('hrms_db'),
  DB_DATABASE: z.string().optional().default('hrms_db'),
  DB_USER: z.string().default('root'),
  DB_USERNAME: z.string().optional(),
  DB_PASSWORD: z.string().default(''),
  DATABASE_URL: z.string().default('mysql://root:@localhost:3306/hrms_db'),
  DB_SSL: z.union([z.boolean(), z.string()]).optional().default(false).transform((val) => (typeof val === 'boolean' ? val : val === 'true' || val === '1')),
  DB_MAX_CONNECTIONS: z.union([z.string(), z.number()]).transform((val) => (typeof val === 'number' ? val : parseInt(val, 10))).default('20'),
  
  // Logging Configuration
  LOG_LEVEL: z.string().default('info'),

  // JWT Configuration (Placeholder for Auth module)
  JWT_SECRET: z.string().default('super-secret-jwt-key-replace-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // ZKTeco Integration (Placeholder for biometric boundary)
  ZKTECO_DEVICE_IP: z.string().default('192.168.1.201'),
  ZKTECO_DEVICE_PORT: z.string().transform((val) => parseInt(val, 10)).default('4370'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment Variable Validation Errors:', parsedEnv.error.format());
  throw new Error('Invalid environment variables configured.');
}

export const env = parsedEnv.data;

/**
 * Never sign logins with the well-known default (or a short) secret: anyone who has read the source could forge
 * tokens. Without a proper JWT_SECRET a random per-process secret is used, so the server stays secure but users
 * are logged out whenever it restarts. Set JWT_SECRET (64+ random characters) to keep sessions across restarts.
 */
const DEFAULT_JWT_SECRET = 'super-secret-jwt-key-replace-in-production-min-32-chars';
export const jwtSecretIsEphemeral = env.JWT_SECRET === DEFAULT_JWT_SECRET || env.JWT_SECRET.length < 32;
if (jwtSecretIsEphemeral) {
  env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  if (env.NODE_ENV !== 'test') {
    console.warn(
      'SECURITY WARNING: JWT_SECRET is missing, default or shorter than 32 characters. ' +
        'Using a random secret for this run; all users will be signed out on restart. Set JWT_SECRET to fix this.'
    );
  }
}
