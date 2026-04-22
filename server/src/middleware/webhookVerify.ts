import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// General webhook signature verification (HMAC-SHA256)
export const verifyWebhookSignature = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers['x-webhook-signature'];
    
    if (!signature || typeof signature !== 'string') {
      res.status(401).json({ error: 'Missing webhook signature' });
      return;
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    next();
  };
};
