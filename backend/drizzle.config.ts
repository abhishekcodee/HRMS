import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export default defineConfig({
  schema: './src/database/schema/*.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hrms_db',
  },
  verbose: true,
  strict: true,
});
