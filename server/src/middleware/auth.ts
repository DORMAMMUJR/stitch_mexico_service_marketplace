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

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // FIX: Detectar la llave y el algoritmo dinámicamente como en el login
    const key = (env.JWT_PUBLIC_KEY || env.JWT_PRIVATE_KEY || 'secret_fallback_key') as string;
    const algorithms = key.includes('BEGIN') ? ['RS256'] : ['HS256'];
    
    const payload = jwt.verify(token, key, { algorithms: algorithms as any }) as unknown as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
