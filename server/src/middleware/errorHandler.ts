/**
 * server/src/middleware/errorHandler.ts
 *
 * Handler global de errores. Debe registrarse como el ÚLTIMO middleware
 * en el servidor principal (después de todas las rutas).
 *
 * Captura cualquier error pasado via next(err) desde las rutas.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Si los headers ya fueron enviados, delegar a Express
  if (res.headersSent) {
    return next(err);
  }

  // Log completo del error siempre (incluye stack en desarrollo)
  logger.error(
    {
      err,
      url:    req.url,
      method: req.method,
      userId: (req as any).user?.userId ?? 'unauthenticated',
    },
    'Unhandled error'
  );

  // En producción nunca exponer detalles internos
  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev ? { details: err.message, stack: err.stack } : {}),
  });
}
