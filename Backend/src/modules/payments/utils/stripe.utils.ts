import { Logger } from '@nestjs/common';
import Stripe from 'stripe';

const logger = new Logger('StripeUtils');

// Safely log payment data without exposing sensitive info
export function safeLogPaymentInfo(paymentId: string, status: string, action: string): void {
  logger.log(`Payment ${paymentId} - Status: ${status} - Action: ${action}`);
}

// Validate Stripe webhook signature
export function validateStripeSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  try {
    const event = Stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    logger.log(`Webhook signature validated for event: ${event.type}`);
    return event;
  } catch (error: any) {
    logger.warn(`Invalid webhook signature: ${error.message}`);
    throw new Error('Invalid webhook signature');
  }
}

// Map Stripe payment intent status to internal payment status
export function mapStripeStatusToPaymentStatus(stripeStatus: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' {
  const statusMap: Record<string, 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'> = {
    // Payment Intent statuses
    'requires_payment_method': 'PENDING',
    'requires_confirmation': 'PENDING',
    'requires_action': 'PENDING',
    'processing': 'PENDING',
    'succeeded': 'APPROVED',
    'canceled': 'CANCELLED',
    'requires_capture': 'PENDING',
    
    // Checkout Session statuses
    'expired': 'CANCELLED',
    'complete': 'APPROVED',
    
    // Charge statuses
    'pending': 'PENDING',
    'failed': 'REJECTED',
    'refunded': 'REFUNDED',
    'disputed': 'REJECTED',
  };

  return statusMap[stripeStatus] || 'PENDING';
}

// Extract relevant data from Stripe event for database update
export function extractPaymentDataFromEvent(event: Stripe.Event): {
  stripePaymentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED';
  customerEmail?: string;
  amount?: number;
  currency?: string;
  stripeCustomerId?: string;
} | null {
  try {
    let stripePaymentId: string | undefined;
    let status: string | undefined;
    let customerEmail: string | undefined;
    let amount: number | undefined;
    let currency: string | undefined;
    let stripeCustomerId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        stripePaymentId = session.payment_intent as string;
        status = 'complete';
        customerEmail = session.customer_details?.email || undefined;
        amount = session.amount_total ? session.amount_total / 100 : undefined;
        currency = session.currency?.toUpperCase();
        stripeCustomerId = session.customer as string | undefined;
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        stripePaymentId = paymentIntent.id;
        status = paymentIntent.status;
        amount = paymentIntent.amount ? paymentIntent.amount / 100 : undefined;
        currency = paymentIntent.currency?.toUpperCase();
        stripeCustomerId = paymentIntent.customer as string;
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        stripePaymentId = failedPayment.id;
        status = failedPayment.status;
        amount = failedPayment.amount ? failedPayment.amount / 100 : undefined;
        currency = failedPayment.currency?.toUpperCase();
        stripeCustomerId = failedPayment.customer as string;
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;
        stripePaymentId = canceledPayment.id;
        status = canceledPayment.status;
        amount = canceledPayment.amount ? canceledPayment.amount / 100 : undefined;
        currency = canceledPayment.currency?.toUpperCase();
        stripeCustomerId = canceledPayment.customer as string;
        break;

      case 'charge.refunded':
        const charge = event.data.object as Stripe.Charge;
        stripePaymentId = charge.payment_intent as string;
        status = 'refunded';
        amount = charge.amount ? charge.amount / 100 : undefined;
        currency = charge.currency?.toUpperCase();
        stripeCustomerId = charge.customer as string;
        break;

      default:
        logger.log(`Unsupported event type: ${event.type}`);
        return null;
    }

    if (!stripePaymentId || !status) {
      logger.warn(`Could not extract payment data from event: ${event.type}`);
      return null;
    }

    return {
      stripePaymentId,
      status: mapStripeStatusToPaymentStatus(status),
      customerEmail,
      amount,
      currency,
      stripeCustomerId,
    };
  } catch (error: any) {
    logger.error(`Error extracting payment data from event: ${error.message}`);
    return null;
  }
}

// Format payment data for safe response (never expose sensitive data)
export function formatPaymentResponse(data: {
  checkoutUrl?: string;
  sessionId?: string;
  clientSecret?: string;
}): Record<string, any> {
  return {
    checkoutUrl: data.checkoutUrl,
    sessionId: data.sessionId,
    // Never return secret keys, payment details, or sensitive data
  };
}

// Validate that payment is approved before granting access
export function isPaymentApproved(status: string): boolean {
  return status === 'APPROVED';
}

// Check if webhook event should be processed (idempotency)
export function shouldProcessEvent(lastWebhookId: string | null, currentWebhookId: string): boolean {
  if (!lastWebhookId) return true;
  return lastWebhookId !== currentWebhookId;
}
