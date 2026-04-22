import { Request, Response, NextFunction } from 'express';

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: insufficient permissions' });
      return;
    }

    next();
  };
};

export const isResourceOwner = (resourceUserIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admins can access everything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check if the user is the owner of the resource
    const targetUserId = req.params[resourceUserIdParam];
    if (req.user.userId !== targetUserId) {
      res.status(403).json({ error: 'Access denied: not the owner of this resource' });
      return;
    }

    next();
  };
};
