import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
const isProduction = nodeEnv === 'production';
const sslMode = String(process.env.DATABASE_SSL_MODE || '').trim().toLowerCase();
const rejectUnauthorizedFromEnv = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();

const shouldUseSsl = isProduction || ['require', 'verify-ca', 'verify-full', 'no-verify'].includes(sslMode);
const rejectUnauthorized =
  rejectUnauthorizedFromEnv === 'true'
    ? true
    : rejectUnauthorizedFromEnv === 'false'
      ? false
      : sslMode === 'verify-ca' || sslMode === 'verify-full';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized } : false,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
