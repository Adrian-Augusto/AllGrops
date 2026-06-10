"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const subscription_service_1 = require("../subscriptions/subscription.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const payment_repository_1 = require("./payment.repository");
const mercado_pago_service_1 = require("./mercado-pago.service");
const mercado_pago_utils_1 = require("./utils/mercado-pago.utils");
const payment_constants_1 = require("./utils/payment.constants");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    subscriptionsService;
    prisma;
    paymentRepository;
    configService;
    logger = new common_1.Logger(PaymentsService_1.name);
    mercadoPagoService;
    defaultPlans = [
        {
            slug: 'seven-days',
            name: '7 Days Sponsored',
            price: 19.99,
            type: 'SPONSORED_7_DAYS',
            description: 'Sponsor your group for 7 days',
            durationDays: 7,
            maxSponsoredGroups: 1,
        },
        {
            slug: 'fifteen-days',
            name: '15 Days Premium',
            price: 29.99,
            type: 'PREMIUM_15_DAYS',
            description: 'Premium account for 15 days',
            durationDays: 15,
            maxSponsoredGroups: 5,
        },
        {
            slug: 'thirty-days',
            name: '30 Days Premium',
            price: 49.99,
            type: 'PREMIUM_30_DAYS',
            description: 'Premium account for 30 days',
            durationDays: 30,
            maxSponsoredGroups: 10,
        },
    ];
    constructor(subscriptionsService, prisma, paymentRepository, configService, mercadoPagoService) {
        this.subscriptionsService = subscriptionsService;
        this.prisma = prisma;
        this.paymentRepository = paymentRepository;
        this.configService = configService;
        this.mercadoPagoService = mercadoPagoService;
        if (!this.mercadoPagoService.isConfigured()) {
            this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN not configured');
        }
    }
    async createPreference({ userId, planId, groupId, idempotencyKey, }) {
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
                    }
                    catch (e) {
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
                throw new common_1.BadRequestException('Plano não encontrado ou inativo');
            }
            // Create pending subscription (premium plan for all user groups)
            console.log('[PaymentsService] Creating subscription...');
            const subscription = await this.subscriptionsService.createSubscription(userId, groupId || '', plan.id);
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
                throw new common_1.ConflictException('Payment already being processed for this request');
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
                externalReference,
                metadata: {
                    userId,
                    planId: plan.id,
                    groupId: groupId || '',
                    subscriptionId: subscription.id,
                },
            });
            console.log('[PaymentsService] Mercado Pago preference created:', preference_id);
            // Save preference ID to subscription
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: { paymentId: preference_id },
            });
            (0, mercado_pago_utils_1.safeLogPaymentInfo)(preference_id, 'PENDING', 'Preference created');
            return {
                init_point,
                preference_id,
                idempotency_key: key,
            };
        }
        catch (error) {
            const errorMessage = this.formatError(error);
            const errorStack = error instanceof Error ? error.stack : '';
            console.error('[PaymentsService] Error creating preference:', errorMessage);
            this.logger.error(`Error creating preference: ${errorMessage}`, errorStack);
            throw error;
        }
    }
    async handleWebhook(body, xSignature, xRequestId) {
        // ALWAYS return 200 OK as quickly as possible
        // NEVER reject webhook with 400 due to unexpected structure
        const webhookId = body.id ? String(body.id) : 'unknown';
        const eventType = body.type || 'unknown';
        const eventAction = body.action || 'unknown';
        this.logger.log(`[Webhook] Received event - ID: ${webhookId}, Type: ${eventType}, Action: ${eventAction}`);
        // Validate webhook signature if secret is configured (non-blocking)
        const webhookSecret = this.configService.get('MERCADO_PAGO_WEBHOOK_SECRET');
        const isProduction = process.env.NODE_ENV === 'production';
        if (webhookSecret && xSignature && xRequestId) {
            const bodyString = JSON.stringify(body);
            const isValidSignature = (0, mercado_pago_utils_1.validateMercadoPagoSignature)(xSignature, xRequestId, bodyString, webhookSecret);
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
            const mappedStatus = payment_constants_1.PAYMENT_STATUS_MAP[mpStatus] || 'REJECTED';
            const externalReference = paymentData.external_reference;
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
                externalReference,
            });
            (0, mercado_pago_utils_1.safeLogPaymentInfo)(paymentId, mappedStatus, 'Webhook processed');
            // Fallback identification: use metadata or external_reference
            let finalExternalReference = externalReference;
            let finalGroupId = metadataGroupId;
            // If external_reference is null but metadata exists, try to reconstruct it
            if (!externalReference && metadataUserId && metadataSubscriptionId) {
                finalExternalReference = `${metadataUserId}:${metadataSubscriptionId}`;
                this.logger.log(`[Webhook] Reconstructed external_reference from metadata: ${finalExternalReference}`);
            }
            // If no identification data, log and return
            if (!finalExternalReference && !metadataSubscriptionId) {
                this.logger.warn(`[Webhook] No identification data (external_reference or metadata) for payment ${paymentId}`);
                return { success: true, message: 'No identification data' };
            }
            // Associate Mercado Pago payment ID and update payment status in database
            const paymentRecord = await this.paymentRepository.findByExternalReference(finalExternalReference);
            if (paymentRecord) {
                await this.paymentRepository.updatePaymentStatus(paymentRecord.id, String(paymentId), mappedStatus);
                this.logger.log(`[Webhook] Payment record ${paymentRecord.id} updated to ${mappedStatus}`);
            }
            else {
                this.logger.warn(`[Webhook] No payment record found for external reference: ${finalExternalReference}`);
            }
            // Update subscription status
            await this.subscriptionsService.updatePaymentStatus(finalExternalReference, String(paymentId), mappedStatus, finalGroupId);
            // Record webhook processing for idempotency
            await this.paymentRepository.recordWebhookProcessing(String(paymentId), webhookId);
            this.logger.log(`[Webhook] Event ${webhookId} processed successfully`);
            return { success: true, status: mappedStatus };
        }
        catch (error) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching plans: ${errorMessage}`);
            throw error;
        }
    }
    async resolvePlan(planId) {
        await this.ensureDefaultPlans();
        const normalizedPlanId = planId.trim().toLowerCase();
        const defaultPlan = this.defaultPlans.find((plan) => plan.slug === normalizedPlanId ||
            plan.name.toLowerCase() === normalizedPlanId ||
            plan.type.toLowerCase() === normalizedPlanId);
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
    async ensureDefaultPlans() {
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
    formatError(error) {
        if (error instanceof Error) {
            return error.message;
        }
        try {
            return JSON.stringify(error);
        }
        catch {
            return String(error);
        }
    }
    getValidUrl(value) {
        if (!value)
            return undefined;
        try {
            const url = new URL(value);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return undefined;
            }
            return url.toString();
        }
        catch {
            return undefined;
        }
    }
    // Extract only safe fields for logging
    extractSafeData(body) {
        const safe = {};
        payment_constants_1.SAFE_LOG_FIELDS.forEach(field => {
            if (body[field] !== undefined) {
                safe[field] = body[field];
            }
        });
        return safe;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionsService,
        prisma_service_1.PrismaService,
        payment_repository_1.PaymentRepository,
        config_1.ConfigService,
        mercado_pago_service_1.MercadoPagoService])
], PaymentsService);
