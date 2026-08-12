import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root if available, or local backend dir
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:5173'),
  
  // Database Configuration (MySQL / Localhost)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform((val) => parseInt(val, 10)).default('3306'),
  DB_NAME: z.string().default('hrms_db'),
  DB_DATABASE: z.string().optional().default('hrms_db'),
  DB_USER: z.string().default('root'),
  DB_USERNAME: z.string().optional().default('root'),
  DB_PASSWORD: z.string().default(''),
  DATABASE_URL: z.string().default('mysql://root:@localhost:3306/hrms_db'),
  DB_MAX_CONNECTIONS: z.string().transform((val) => parseInt(val, 10)).default('20'),
  
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
