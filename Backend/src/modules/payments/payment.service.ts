import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from '../subscriptions/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRepository } from './payment.repository';
import { StripeService } from './stripe.service';
import { safeLogPaymentInfo, extractPaymentDataFromEvent, shouldProcessEvent, isPaymentApproved } from './utils/stripe.utils';
import { SAFE_LOG_FIELDS } from './utils/payment.constants';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripeService: StripeService;
  private readonly defaultPlans = [
    {
      slug: 'three-days',
      name: '3 Days Sponsored',
      price: 0.50,
      type: 'SPONSORED_3_DAYS' as const,
      description: 'Sponsor your group for 3 days',
      durationDays: 3,
      maxSponsoredGroups: 1,
    },
    {
      slug: 'seven-days',
      name: '7 Days Sponsored',
      price: 19.99,
      type: 'SPONSORED_7_DAYS' as const,
      description: 'Sponsor your group for 7 days',
      durationDays: 7,
      maxSponsoredGroups: 1,
    },
    {
      slug: 'fifteen-days',
      name: '15 Days Premium',
      price: 29.99,
      type: 'PREMIUM_15_DAYS' as const,
      description: 'Premium account for 15 days',
      durationDays: 15,
      maxSponsoredGroups: 5,
    },
    {
      slug: 'thirty-days',
      name: '30 Days Premium',
      price: 49.99,
      type: 'PREMIUM_30_DAYS' as const,
      description: 'Premium account for 30 days',
      durationDays: 30,
      maxSponsoredGroups: 10,
    },
  ];

  constructor(
    private subscriptionsService: SubscriptionsService,
    private prisma: PrismaService,
    private paymentRepository: PaymentRepository,
    private configService: ConfigService,
    stripeService: StripeService,
  ) {
    this.stripeService = stripeService;
    
    if (!this.stripeService.isConfigured()) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
    }
  }

  async createPreference({
    userId,
    planId,
    groupId,
    idempotencyKey,
  }: {
    userId: string;
    planId: string;
    groupId?: string;
    idempotencyKey?: string;
  }) {
    console.log('[PaymentsService] createPreference called - userId:', userId, 'planId:', planId, 'groupId:', groupId, 'idempotencyKey:', idempotencyKey);

    try {
      // Generate or validate idempotency key
      const key = idempotencyKey || this.paymentRepository.generateIdempotencyKey(userId, planId);
      console.log('[PaymentsService] Idempotency key:', key);

      // Check for duplicate request
      const existingPayment = await this.paymentRepository.findByIdempotencyKey(key);
      if (existingPayment) {
        this.logger.log(`Duplicate payment request with key: ${key}`);
        console.log('[PaymentsService] Returning cached payment:', existingPayment.id);
        
        let checkoutUrl = undefined;
        const sessionId = existingPayment.subscription?.paymentId;
        if (sessionId) {
          try {
            const session = await this.stripeService.getCheckoutSession(sessionId);
            checkoutUrl = session.url;
          } catch (e: any) {
            this.logger.warn(`Failed to fetch session details from Stripe: ${e.message}`);
          }
        }

        // Return cached result if already exists
        return {
          checkout_url: checkoutUrl,
          session_id: sessionId || undefined,
          status: existingPayment.status,
        };
      }

      // Validate plan exists and is active (accepts UUID, slug, name, or type)
      console.log('[PaymentsService] Looking up plan:', planId);
      const plan = await this.resolvePlan(planId);

      console.log('[PaymentsService] Plan found:', plan ? plan.id : 'NOT FOUND');
      if (!plan || !plan.isActive) {
        console.error('[PaymentsService] Plan not found or inactive:', planId);
        throw new BadRequestException('Plano não encontrado ou inativo');
      }

      // Create pending subscription (premium plan for all user groups)
      console.log('[PaymentsService] Creating subscription...');
      const subscription = await this.subscriptionsService.createSubscription(
        userId,
        groupId || '',
        plan.id,
      );
      console.log('[PaymentsService] Subscription created:', subscription.id);

      // Create payment tracking record
      const externalReference = `${userId}:${plan.id}:${subscription.id}`;
      console.log('[PaymentsService] Creating payment record...');
      const paymentRecord = await this.paymentRepository.createPayment({
        subscriptionId: subscription.id,
        idempotencyKey: key,
        externalReference,
      });

      if (!paymentRecord) {
        console.error('[PaymentsService] Payment record creation failed');
        throw new ConflictException('Payment already being processed for this request');
      }
      console.log('[PaymentsService] Payment record created:', paymentRecord.id);

      // Create Stripe Checkout Session
      const frontendUrl = process.env.FRONTEND_URL || 'https://allgrops.onrender.com';
      console.log('[PaymentsService] Creating Stripe Checkout Session...');
      
      const { sessionId, checkoutUrl } = await this.stripeService.createCheckoutSession({
        planName: `${plan.name} - Plano Premium`,
        planPrice: plan.price,
        successUrl: `${frontendUrl}/pagamento/sucesso`,
        cancelUrl: `${frontendUrl}/pagamento/falha`,
        metadata: {
          userId,
          planId: plan.id,
          groupId: groupId || '',
          subscriptionId: subscription.id,
          externalReference,
        },
      });

      console.log('[PaymentsService] Stripe Checkout Session created:', sessionId);

      // Save session ID to subscription
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { paymentId: sessionId },
      });

      safeLogPaymentInfo(sessionId, 'PENDING', 'Checkout session created');

      return {
        checkout_url: checkoutUrl,
        session_id: sessionId,
        idempotency_key: key,
      };
    } catch (error: unknown) {
      const errorMessage = this.formatError(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('[PaymentsService] Error creating preference:', errorMessage);
      this.logger.error(`Error creating preference: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async handleWebhook(
    body: any,
    stripeSignature?: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    try {
      // Validate webhook signature
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      
      if (webhookSecret && stripeSignature) {
        try {
          const event = this.stripeService.verifyWebhookSignature(
            JSON.stringify(body),
            stripeSignature,
          );
          
          // Log only safe fields
          const safeData = this.extractSafeData(event);
          this.logger.log(`Webhook received: ${event.type}`);

          // Extract payment data from event
          const paymentData = extractPaymentDataFromEvent(event);
          if (!paymentData) {
            this.logger.log(`Unsupported event type: ${event.type}`);
            return { success: true };
          }

          const { stripePaymentId, status, customerEmail, amount, currency, stripeCustomerId } = paymentData;

          // Check for duplicate webhook processing
          const existingPayment = await this.paymentRepository.findByStripePaymentId(stripePaymentId);
          if (existingPayment && !shouldProcessEvent(existingPayment.lastWebhookId, event.id)) {
            this.logger.log(`Webhook already processed: ${event.id}`);
            return { success: true };
          }

          // Extract metadata from event
          const metadata = (event.data.object as any).metadata || {};
          const metadataGroupId = metadata.groupId;
          const metadataUserId = metadata.userId;
          const metadataSubscriptionId = metadata.subscriptionId;
          const externalReference = metadata.externalReference;

          console.log('[PaymentsService] Webhook metadata:', {
            groupId: metadataGroupId,
            userId: metadataUserId,
            subscriptionId: metadataSubscriptionId,
            externalReference,
          });

          safeLogPaymentInfo(stripePaymentId, status, 'Webhook processed');

          // Update payment status in database
          const paymentRecord = await this.paymentRepository.findByExternalReference(externalReference);
          if (paymentRecord) {
            await this.paymentRepository.updatePaymentStatus(
              paymentRecord.id,
              stripePaymentId,
              status,
              customerEmail,
              amount,
              currency,
              stripeCustomerId,
            );
          }

          // Update subscription status
          await this.subscriptionsService.updatePaymentStatus(
            externalReference,
            stripePaymentId,
            status as 'APPROVED' | 'REJECTED' | 'PENDING',
            metadataGroupId,
          );

          // Record webhook processing for idempotency
          if (paymentRecord) {
            await this.paymentRepository.recordWebhookProcessing(paymentRecord.id, event.id);
          }

          return { success: true, status };
        } catch (error: any) {
          this.logger.error(`Error verifying webhook signature: ${error.message}`);
          if (isProduction) {
            throw new BadRequestException('Invalid webhook signature');
          } else {
            this.logger.warn('Dev mode: allowing request despite invalid signature');
          }
        }
      } else {
        if (isProduction) {
          this.logger.error('STRIPE_WEBHOOK_SECRET not configured in production');
          throw new BadRequestException('Webhook secret not configured');
        } else {
          this.logger.warn('Dev mode: STRIPE_WEBHOOK_SECRET not configured, skipping signature validation');
          // In dev mode, try to process without signature validation
          const paymentData = extractPaymentDataFromEvent(body as any);
          if (paymentData) {
            this.logger.log(`Processing webhook without signature validation: ${paymentData.stripePaymentId}`);
            return { success: true, status: paymentData.status };
          }
        }
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing webhook: ${errorMessage}`);
      // Return 200 OK to prevent webhook retries on errors
      return { success: true };
    }
  }

  async getAvailablePlans() {
    try {
      await this.ensureDefaultPlans();

      const plans = await this.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });

      this.logger.log(`Available plans: ${plans.length}`);
      return plans;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching plans: ${errorMessage}`);
      throw error;
    }
  }

  private async resolvePlan(planId: string) {
    await this.ensureDefaultPlans();

    const normalizedPlanId = planId.trim().toLowerCase();
    const defaultPlan = this.defaultPlans.find((plan) =>
      plan.slug === normalizedPlanId ||
      plan.name.toLowerCase() === normalizedPlanId ||
      plan.type.toLowerCase() === normalizedPlanId,
    );

    return this.prisma.plan.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: planId },
          { name: { equals: planId, mode: 'insensitive' } },
          ...(defaultPlan
            ? [
                { name: defaultPlan.name },
                { type: defaultPlan.type },
              ]
            : []),
        ],
      },
    });
  }

  private async ensureDefaultPlans() {
    await this.prisma.plan.updateMany({
      where: {
        isActive: true,
        price: 0.01,
      },
      data: { isActive: false },
    });

    for (const plan of this.defaultPlans) {
      await this.prisma.plan.upsert({
        where: { name: plan.name },
        update: {
          price: plan.price,
          type: plan.type,
          description: plan.description,
          durationDays: plan.durationDays,
          maxSponsoredGroups: plan.maxSponsoredGroups,
          isActive: true,
        },
        create: {
          name: plan.name,
          price: plan.price,
          type: plan.type,
          description: plan.description,
          durationDays: plan.durationDays,
          maxSponsoredGroups: plan.maxSponsoredGroups,
          isActive: true,
        },
      });
    }
  }


  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  // Extract only safe fields for logging
  private extractSafeData(body: any): Record<string, any> {
    const safe: Record<string, any> = {};
    SAFE_LOG_FIELDS.forEach(field => {
      if (body[field] !== undefined) {
        safe[field] = body[field];
      }
    });
    return safe;
  }
}




