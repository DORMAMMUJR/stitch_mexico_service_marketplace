import { PaymentProvider } from './provider';
import { Order } from '@prisma/client';
import { env } from '../../config/env';

// Placeholder for actual Stripe SDK
// import Stripe from 'stripe';
// const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export class StripePaymentProvider implements PaymentProvider {
  
  async createPaymentIntent(order: Order, amount: number, currency: string) {
    // const intent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Stripe expects cents
    //   currency: currency.toLowerCase(),
    //   metadata: { orderId: order.id }
    // });
    // return { id: intent.id, clientSecret: intent.client_secret! };
    
    console.log(`[Stripe Mock] Created payment intent for order ${order.id} - ${amount} ${currency}`);
    return { id: `pi_mock_${Date.now()}`, clientSecret: 'secret_mock' };
  }

  async verifyPayment(paymentIntentId: string) {
    // const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    // return intent.status === 'succeeded';
    
    console.log(`[Stripe Mock] Verified payment intent ${paymentIntentId}`);
    return true;
  }

  async releaseFunds(order: Order, destinationAccountId: string, amount: number) {
    // Calculamos comisión de plataforma (ej: 10%)
    // const transferAmount = Math.round(amount * 0.9 * 100); 
    // const transfer = await stripe.transfers.create({
    //   amount: transferAmount,
    //   currency: order.currency.toLowerCase(),
    //   destination: destinationAccountId,
    //   metadata: { orderId: order.id }
    // });
    // return transfer.id;
    
    console.log(`[Stripe Mock] Released ${amount * 0.9} to ${destinationAccountId} for order ${order.id}`);
    return `tr_mock_${Date.now()}`;
  }

  async refund(paymentIntentId: string, amount?: number) {
    // const refundParams: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    // if (amount) refundParams.amount = Math.round(amount * 100);
    // const refund = await stripe.refunds.create(refundParams);
    // return refund.id;

    console.log(`[Stripe Mock] Refunded ${amount ? amount : 'full'} for ${paymentIntentId}`);
    return `re_mock_${Date.now()}`;
  }
}
