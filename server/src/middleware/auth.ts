/**
 * server/src/middleware/auth.ts
 *
 * Dos middlewares:
 * - authenticate: requiere token válido, responde 401 si no hay o es inválido.
 * - optionalAuthenticate: distingue entre ausencia de token (guest OK)
 *   y token inválido/expirado (401 explícito).
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function getVerificationKey(): string {
  return (env.JWT_PUBLIC_KEY || env.JWT_PRIVATE_KEY || 'secret_fallback_key') as string;
}

function getAlgorithms(key: string): ('RS256' | 'HS256')[] {
  return key.includes('BEGIN') ? ['RS256'] : ['HS256'];
}

function extractToken(req: Request): string | null {
  return req.cookies?.access_token || req.headers.authorization?.split(' ')[1] || null;
}

// ─── Middleware obligatorio ───────────────────────────────────────────────────
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Autenticación requerida' });
    return;
  }

  try {
    const key = getVerificationKey();
    const payload = jwt.verify(token, key, {
      algorithms: getAlgorithms(key),
    }) as unknown as JwtPayload;

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'La sesión ha expirado. Por favor inicia sesión nuevamente.' });
      return;
    }
    // JsonWebTokenError, NotBeforeError u otro error de JWT
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ─── Middleware opcional ──────────────────────────────────────────────────────
// Diferencia tres casos:
//   1. Sin token      → continúa como guest (req.user = undefined)
//   2. Token expirado → 401 explícito (el cliente debe renovar sesión)
//   3. Token inválido → 401 explícito (posible manipulación)
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req);

  // Caso 1: no hay token → guest legítimo, continuar
  if (!token) {
    return next();
  }

  try {
    const key = getVerificationKey();
    const payload = jwt.verify(token, key, {
      algorithms: getAlgorithms(key),
    }) as unknown as JwtPayload;

    req.user = payload;
    next();
  } catch (err) {
    // Caso 2: token expirado → forzar re-login, no tratar como guest
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'La sesión ha expirado. Por favor inicia sesión nuevamente.' });
      return;
    }
    // Caso 3: token manipulado o malformado → rechazar explícitamente
    res.status(401).json({ error: 'Token inválido' });
  }
};
