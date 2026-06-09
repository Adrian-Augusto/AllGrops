import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { SubscriptionsService } from '../subscriptions/subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRepository } from './payment.repository';
import { MercadoPagoService } from './mercado-pago.service';
import { safeLogPaymentInfo, validateMercadoPagoSignature, mapMercadoPagoStatus } from './utils/mercado-pago.utils';
import { PAYMENT_STATUS_MAP, SAFE_LOG_FIELDS } from './utils/payment.constants';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mercadoPagoService: MercadoPagoService;
  private readonly defaultPlans = [
    {
      slug: 'three-days',
      name: '3 Days Sponsored',
      price: 0.10,
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
    mercadoPagoService: MercadoPagoService,
  ) {
    this.mercadoPagoService = mercadoPagoService;
    
    if (!this.mercadoPagoService.isConfigured()) {
      this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN not configured');
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
        
        let initPoint = undefined;
        const preferenceId = existingPayment.subscription?.paymentId;
        if (preferenceId) {
          try {
            const preference = await this.mercadoPagoService.getPreference(preferenceId);
            initPoint = preference.init_point;
          } catch (e: any) {
            this.logger.warn(`Failed to fetch preference details from Mercado Pago: ${e.message}`);
          }
        }

        // Return cached result if already exists
        return {
          init_point: initPoint,
          preference_id: preferenceId || undefined,
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

      // Create Mercado Pago preference
      const frontendUrl = process.env.FRONTEND_URL || 'https://allgrops.onrender.com';
      const notificationUrl = this.getValidUrl(process.env.MERCADO_PAGO_WEBHOOK_URL) || 'https://allgrops.onrender.com/api/v1/payments/webhook';
      console.log('[PaymentsService] Creating Mercado Pago preference...');
      console.log('[PaymentsService] Notification URL:', notificationUrl);
      
      const { init_point, preference_id } = await this.mercadoPagoService.createPreference({
        planName: `${plan.name} - Plano Premium`,
        planPrice: plan.price,
        successUrl: `${frontendUrl}/pagamento/sucesso`,
        failureUrl: `${frontendUrl}/pagamento/falha`,
        pendingUrl: `${frontendUrl}/pagamento/pendente`,
        notificationUrl: notificationUrl || undefined,
        metadata: {
          userId,
          planId: plan.id,
          groupId: groupId || '',
          subscriptionId: subscription.id,
          externalReference,
        },
      });

      console.log('[PaymentsService] Mercado Pago preference created:', preference_id);

      // Save preference ID to subscription
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { paymentId: preference_id },
      });

      safeLogPaymentInfo(preference_id, 'PENDING', 'Preference created');

      return {
        init_point,
        preference_id,
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
    xSignature?: string,
    xRequestId?: string,
  ) {
    // ALWAYS return 200 OK as quickly as possible
    // NEVER reject webhook with 400 due to unexpected structure
    
    const webhookId = body.id || 'unknown';
    const eventType = body.type || 'unknown';
    const eventAction = body.action || 'unknown';

    this.logger.log(`[Webhook] Received event - ID: ${webhookId}, Type: ${eventType}, Action: ${eventAction}`);

    // Validate webhook signature if secret is configured (non-blocking)
    const webhookSecret = this.configService.get<string>('MERCADO_PAGO_WEBHOOK_SECRET');
    const isProduction = process.env.NODE_ENV === 'production';

    if (webhookSecret && xSignature && xRequestId) {
      const bodyString = JSON.stringify(body);
      const isValidSignature = validateMercadoPagoSignature(
        xSignature,
        xRequestId,
        bodyString,
        webhookSecret,
      );

      if (!isValidSignature) {
        this.logger.warn(`[Webhook] Invalid signature for event ${webhookId} - still processing for safety`);
        // Continue processing even with invalid signature - log for investigation
      }
    }

    try {
      // Extract data safely - handle missing fields gracefully
      const topic = body.type;
      const data = body.data || {};
      const paymentId = data.id;

      // If type is not "payment" or payment ID doesn't exist, log and return 200
      if (topic !== 'payment' && topic !== 'order') {
        this.logger.log(`[Webhook] Ignoring unsupported event type: ${topic}`);
        return { success: true, message: 'Event type not supported' };
      }

      if (!paymentId) {
        this.logger.warn(`[Webhook] No payment ID found in event ${webhookId}`);
        return { success: true, message: 'No payment ID' };
      }

      // Check for duplicate webhook processing (idempotency)
      const existingPayment = await this.paymentRepository.findByMercadoPagoId(String(paymentId));
      if (existingPayment?.lastWebhookId === webhookId) {
        this.logger.log(`[Webhook] Event ${webhookId} already processed - idempotent`);
        return { success: true, message: 'Already processed' };
      }

      // Fetch payment details from Mercado Pago API (NEVER trust webhook body)
      this.logger.log(`[Webhook] Fetching payment ${paymentId} from Mercado Pago API`);
      const paymentResponse = await this.mercadoPagoService.getPayment(String(paymentId));
      const paymentData = paymentResponse;

      const mpStatus = paymentData.status || 'unknown';
      const mappedStatus = PAYMENT_STATUS_MAP[mpStatus] || 'REJECTED';
      const externalReference = paymentData.external_reference as string;

      this.logger.log(`[Webhook] Payment ${paymentId} status: ${mpStatus} -> ${mappedStatus}`);

      // Extract metadata from payment
      const metadata = paymentData.metadata || {};
      const metadataGroupId = metadata.groupId;
      const metadataUserId = metadata.userId;
      const metadataSubscriptionId = metadata.subscriptionId;

      console.log('[PaymentsService] Webhook metadata:', {
        groupId: metadataGroupId,
        userId: metadataUserId,
        subscriptionId: metadataSubscriptionId,
        paymentStatus: mpStatus,
        mappedStatus,
      });

      safeLogPaymentInfo(paymentId, mappedStatus, 'Webhook processed');

      // Associate Mercado Pago payment ID and update payment status in database
      const paymentRecord = await this.paymentRepository.findByExternalReference(externalReference);
      if (paymentRecord) {
        await this.paymentRepository.updatePaymentStatus(
          paymentRecord.id,
          String(paymentId),
          mappedStatus as any,
        );
        this.logger.log(`[Webhook] Payment record ${paymentRecord.id} updated to ${mappedStatus}`);
      } else {
        this.logger.warn(`[Webhook] No payment record found for external reference: ${externalReference}`);
      }

      // Update subscription status
      await this.subscriptionsService.updatePaymentStatus(
        externalReference,
        String(paymentId),
        mappedStatus as 'APPROVED' | 'REJECTED' | 'PENDING',
        metadataGroupId,
      );

      // Record webhook processing for idempotency
      await this.paymentRepository.recordWebhookProcessing(String(paymentId), webhookId);

      this.logger.log(`[Webhook] Event ${webhookId} processed successfully`);
      return { success: true, status: mappedStatus };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Webhook] Error processing event ${webhookId}: ${errorMessage}`);
      // ALWAYS return 200 OK to prevent webhook retries
      // Errors should be investigated through logs, not by webhook re-delivery
      return { success: true, message: 'Error logged, will investigate' };
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

  private getValidUrl(value?: string) {
    if (!value) return undefined;

    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return undefined;
      }
      return url.toString();
    } catch {
      return undefined;
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




