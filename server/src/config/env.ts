import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  DATABASE_SSL_MODE: z.enum(['disable', 'require', 'verify-ca', 'verify-full', 'no-verify']).optional(),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).optional(),
  DATABASE_SSL_CA_CERT: z.string().optional(),
  DATABASE_SSL_CA_CERT_BASE64: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  APP_URL: z.string().default('http://localhost:5173'),
  TRUST_PROXY_HOPS: z.string().optional(),

  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  CHAT_ENCRYPTION_KEY: z.string().optional(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  SENTRY_DSN: z.string().url().optional(),

  N8N_WEBHOOK_SECRET: z.string().optional(),
  BANK_TRANSFER_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  METAMAP_API_KEY: z.string().optional(),
  METAMAP_WEBHOOK_SECRET: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === 'production' &&
  (!parsedEnv.data.JWT_PRIVATE_KEY || parsedEnv.data.JWT_PRIVATE_KEY.trim() === '')
) {
  console.error('JWT_PRIVATE_KEY es obligatoria en produccion');
  process.exit(1);
}

const enforceWebhookSecrets =
  parsedEnv.data.NODE_ENV === 'production' ||
  String(process.env.ENFORCE_WEBHOOK_SECRETS || '').toLowerCase() === 'true';

if (enforceWebhookSecrets) {
  const missingWebhookSecrets: string[] = [];

  if (!parsedEnv.data.BANK_TRANSFER_WEBHOOK_SECRET || parsedEnv.data.BANK_TRANSFER_WEBHOOK_SECRET.trim() === '') {
    missingWebhookSecrets.push('BANK_TRANSFER_WEBHOOK_SECRET');
  }
  if (!parsedEnv.data.STRIPE_WEBHOOK_SECRET || parsedEnv.data.STRIPE_WEBHOOK_SECRET.trim() === '') {
    missingWebhookSecrets.push('STRIPE_WEBHOOK_SECRET');
  }

  if (missingWebhookSecrets.length > 0) {
    console.error(`Faltan secretos de webhook requeridos: ${missingWebhookSecrets.join(', ')}`);
    process.exit(1);
  }
}

export const env = parsedEnv.data;
