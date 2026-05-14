import crypto from 'crypto';
import { env } from '../config/env';

export type EncryptedMessagePayload = {
  iv: string;
  tag: string;
  ciphertext: string;
  keyVersion: number;
};

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_VERSION = 1;

function getEncryptionKeyMaterial(): string {
  const raw =
    env.CHAT_ENCRYPTION_KEY ||
    env.JWT_PRIVATE_KEY ||
    env.JWT_PUBLIC_KEY ||
    '';
  return raw.trim();
}

function buildKey(): Buffer | null {
  const material = getEncryptionKeyMaterial();
  if (!material) return null;
  return crypto.createHash('sha256').update(material).digest();
}

export function canEncryptMessages(): boolean {
  return Boolean(buildKey());
}

export function encryptMessage(plainText: string): EncryptedMessagePayload | null {
  const key = buildKey();
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    keyVersion: ENCRYPTION_KEY_VERSION,
  };
}

export function decryptMessage(payload: EncryptedMessagePayload): string | null {
  const key = buildKey();
  if (!key) return null;

  try {
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

