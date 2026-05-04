/**
 * server/src/lib/stripe.ts
 *
 * Inicialización lazy de Stripe — el servidor arranca aunque STRIPE_SECRET_KEY
 * no esté configurada. El error solo ocurre si se intenta usar Stripe, no al
 * importar el módulo.
 *
 * Uso:
 *   import { getStripe } from '../lib/stripe';
 *   const stripe = getStripe(); // Lanza si no hay key — manejable en try/catch
 */

import Stripe from 'stripe';

let _instance: any = null;

/**
 * Devuelve la instancia singleton de Stripe.
 * Lanza un error claro si STRIPE_SECRET_KEY no está configurada.
 * Llámala dentro de los handlers, nunca en el top-level del módulo.
 */
export function getStripe(): any {
  if (_instance) return _instance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      '[Stripe] STRIPE_SECRET_KEY no está configurada. ' +
      'Agrégala a las variables de entorno para activar pagos.'
    );
  }

  _instance = new Stripe(key, {
    apiVersion: '2024-06-20' as any,
    typescript: true,
  });

  return _instance;
}
