import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' ? { details: err.message } : {}),
  });
}
