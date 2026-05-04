import Stripe from 'stripe';
import { env } from '../config/env';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error(
    '❌ STRIPE_SECRET_KEY no está configurada. El servidor no puede iniciar sin una clave de Stripe válida.'
  );
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia' as any,
});
