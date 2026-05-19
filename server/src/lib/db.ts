import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './logger';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
const isProduction = nodeEnv === 'production';
const sslMode = String(process.env.DATABASE_SSL_MODE || '').trim().toLowerCase();
const rejectUnauthorizedFromEnv = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
const inlineCa = String(process.env.DATABASE_SSL_CA_CERT || '').trim();
const base64Ca = String(process.env.DATABASE_SSL_CA_CERT_BASE64 || '').trim();

const shouldUseSsl = isProduction || ['require', 'verify-ca', 'verify-full', 'no-verify'].includes(sslMode);
const rejectUnauthorized =
  rejectUnauthorizedFromEnv === 'true'
    ? true
    : rejectUnauthorizedFromEnv === 'false'
      ? false
      : sslMode === 'verify-ca' || sslMode === 'verify-full';

const resolvedCa = inlineCa || (base64Ca ? Buffer.from(base64Ca, 'base64').toString('utf8') : '');
const sslConfig =
  shouldUseSsl
    ? {
        rejectUnauthorized,
        ...(resolvedCa ? { ca: resolvedCa } : {}),
      }
    : false;

if (shouldUseSsl && rejectUnauthorized && !resolvedCa && isProduction) {
  logger.warn(
    'DATABASE SSL en modo estricto sin CA custom. Si el proveedor usa CA privada, configure DATABASE_SSL_CA_CERT(_BASE64).'
  );
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
