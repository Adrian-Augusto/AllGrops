import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
    }

    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2024-11-20.acacia',
    });

    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  /**
   * Create a Stripe Checkout Session for payment
   * @param params - Payment parameters
   * @returns Checkout session with URL
   */
  async createCheckoutSession(params: {
    planName: string;
    planPrice: number;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: params.planName,
                description: 'Plano Premium AllGrops',
              },
              unit_amount: Math.round(params.planPrice * 100), // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: params.metadata,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      });

      this.logger.log(`Checkout session created: ${session.id}`);

      return {
        sessionId: session.id,
        checkoutUrl: session.url!,
      };
    } catch (error: any) {
      this.logger.error(`Error creating checkout session: ${error.message}`);
      throw new BadRequestException('Failed to create payment session');
    }
  }

  /**
   * Create a Stripe customer (optional, for better customer management)
   * @param email - Customer email
   * @param name - Customer name (optional)
   * @returns Stripe customer ID
   */
  async createCustomer(email: string, name?: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      this.logger.log(`Customer created: ${customer.id}`);
      return customer.id;
    } catch (error: any) {
      this.logger.error(`Error creating customer: ${error.message}`);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Retrieve a checkout session by ID
   * @param sessionId - Stripe session ID
   * @returns Checkout session details
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error: any) {
      this.logger.error(`Error retrieving checkout session: ${error.message}`);
      throw new BadRequestException('Failed to retrieve checkout session');
    }
  }

  /**
   * Retrieve a payment intent by ID
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(`Error retrieving payment intent: ${error.message}`);
      throw new BadRequestException('Failed to retrieve payment intent');
    }
  }

  /**
   * Verify webhook signature
   * @param payload - Raw webhook payload
   * @param signature - Stripe signature header
   * @returns Verified Stripe event
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured');
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      this.logger.log(`Webhook signature verified for event: ${event.type}`);
      return event;
    } catch (error: any) {
      this.logger.error(`Invalid webhook signature: ${error.message}`);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get Stripe client instance (for advanced use cases)
   * @returns Stripe client
   */
  getClient(): Stripe {
    return this.stripe;
  }

  /**
   * Check if Stripe is properly configured
   * @returns true if configured
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('STRIPE_SECRET_KEY');
  }
}
