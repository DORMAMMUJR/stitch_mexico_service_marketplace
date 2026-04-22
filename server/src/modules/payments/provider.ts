import { Order } from '@prisma/client';

export interface PaymentProvider {
  /**
   * Initializes a payment intent for an order and returns the client secret or payment URL
   */
  createPaymentIntent(order: Order, amount: number, currency: string): Promise<{ id: string, clientSecret: string }>;
  
  /**
   * Confirms that funds have been successfully captured and are in the platform's escrow
   */
  verifyPayment(paymentIntentId: string): Promise<boolean>;

  /**
   * Transfers funds from the platform to the professional's connected account
   */
  releaseFunds(order: Order, destinationAccountId: string, amount: number): Promise<string>;

  /**
   * Refunds money back to the client (full or partial)
   */
  refund(paymentIntentId: string, amount?: number): Promise<string>;
}
