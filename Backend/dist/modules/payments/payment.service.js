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
const mercadopago_1 = require("mercadopago");
const subscription_service_1 = require("../subscriptions/subscription.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const payment_repository_1 = require("./payment.repository");
const payment_constants_1 = require("./utils/payment.constants");
const mercado_pago_utils_1 = require("./utils/mercado-pago.utils");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    subscriptionsService;
    prisma;
    paymentRepository;
    configService;
    logger = new common_1.Logger(PaymentsService_1.name);
    accessToken;
    preferenceClient;
    paymentClient;
    defaultPlans = [
        {
            slug: 'three-days',
            name: '3 Days Sponsored',
            price: 0.1,
            type: 'SPONSORED_3_DAYS',
            description: 'Sponsor your group for 3 days',
            durationDays: 3,
            maxSponsoredGroups: 1,
        },
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
    constructor(subscriptionsService, prisma, paymentRepository, configService) {
        this.subscriptionsService = subscriptionsService;
        this.prisma = prisma;
        this.paymentRepository = paymentRepository;
        this.configService = configService;
        this.accessToken = this.configService.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
        if (!this.accessToken) {
            this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN not configured');
        }
        // Initialize Mercado Pago SDK v3.1.0
        const config = new mercadopago_1.MercadoPagoConfig({ accessToken: this.accessToken });
        this.preferenceClient = new mercadopago_1.Preference(config);
        this.paymentClient = new mercadopago_1.Payment(config);
    }
    async createPreference({ userId, planId, idempotencyKey, }) {
        console.log('[PaymentsService] createPreference called - userId:', userId, 'planId:', planId, 'idempotencyKey:', idempotencyKey);
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
                        const preference = await this.preferenceClient.get({ id: preferenceId });
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
            const subscription = await this.subscriptionsService.createSubscription(userId, '', // Empty groupId for premium subscription
            plan.id);
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
            const notificationUrl = this.getValidUrl(process.env.MERCADO_PAGO_WEBHOOK_URL);
            console.log('[PaymentsService] Creating Mercado Pago preference...');
            const preference = {
                items: [
                    {
                        title: `${plan.name} - Plano Premium`,
                        quantity: 1,
                        currency_id: 'BRL',
                        unit_price: plan.price,
                    },
                ],
                payer: {
                    email: process.env.MERCADO_PAGO_PAYER_EMAIL || 'noreply@allgrops.com',
                },
                external_reference: externalReference,
                back_urls: {
                    success: `${frontendUrl}/pagamento/sucesso`,
                    failure: `${frontendUrl}/pagamento/falha`,
                    pending: `${frontendUrl}/pagamento/pendente`,
                },
                payment_methods: {
                    excluded_payment_types: [{ id: 'atm' }],
                },
            };
            if (notificationUrl) {
                preference.notification_url = notificationUrl;
            }
            else {
                this.logger.warn('MERCADO_PAGO_WEBHOOK_URL invalid or not configured; creating preference without notification_url');
            }
            const response = await this.preferenceClient.create({ body: preference });
            console.log('[PaymentsService] Mercado Pago preference created:', response.id);
            // Save preference ID to subscription
            await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: { paymentId: response.id },
            });
            (0, mercado_pago_utils_1.safeLogPaymentInfo)(response.id, 'PENDING', 'Preference created');
            return {
                init_point: response.init_point,
                preference_id: response.id,
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
        // Validate webhook signature if secret is configured
        const webhookSecret = this.configService.get('MERCADO_PAGO_WEBHOOK_SECRET');
        const isProduction = process.env.NODE_ENV === 'production';
        if (webhookSecret) {
            const bodyString = JSON.stringify(body);
            const isValidSignature = (0, mercado_pago_utils_1.validateMercadoPagoSignature)(xSignature, xRequestId, bodyString, webhookSecret);
            if (!isValidSignature) {
                this.logger.warn('Invalid webhook signature - rejecting request');
                if (isProduction) {
                    throw new common_1.BadRequestException('Invalid webhook signature');
                }
                else {
                    this.logger.warn('Dev mode: allowing request despite invalid signature');
                }
            }
        }
        else {
            if (isProduction) {
                this.logger.error('MERCADO_PAGO_WEBHOOK_SECRET not configured in production');
                throw new common_1.BadRequestException('Webhook secret not configured');
            }
            else {
                this.logger.warn('Dev mode: MERCADO_PAGO_WEBHOOK_SECRET not configured, skipping signature validation');
            }
        }
        try {
            // Log only safe fields
            const safeData = this.extractSafeData(body);
            this.logger.log(`Webhook received: ${JSON.stringify(safeData)}`);
            // Validate event type
            const topic = body.type;
            if (topic !== 'payment') {
                this.logger.log(`Ignoring unsupported event type: ${topic}`);
                return { success: true }; // Return 200 OK even for unsupported events
            }
            const paymentId = body.data?.id;
            if (!paymentId) {
                this.logger.warn('Payment ID not found in webhook');
                return { success: true }; // Return 200 OK to avoid retries
            }
            // Check for duplicate webhook processing
            const existingPayment = await this.paymentRepository.findByMercadoPagoId(String(paymentId));
            if (existingPayment?.lastWebhookId === body.id) {
                this.logger.log(`Webhook already processed: ${body.id}`);
                return { success: true }; // Idempotent
            }
            // Fetch payment details from Mercado Pago (don't trust webhook body)
            const paymentResponse = await this.paymentClient.get({ id: String(paymentId) });
            const paymentData = paymentResponse;
            const mappedStatus = payment_constants_1.PAYMENT_STATUS_MAP[paymentData.status] || 'REJECTED';
            const externalReference = paymentData.external_reference;
            (0, mercado_pago_utils_1.safeLogPaymentInfo)(paymentId, mappedStatus, 'Webhook processed');
            // Associate Mercado Pago payment ID and update payment status in database
            const paymentRecord = await this.paymentRepository.findByExternalReference(externalReference);
            if (paymentRecord) {
                await this.paymentRepository.updatePaymentStatus(paymentRecord.id, String(paymentId), mappedStatus);
            }
            // Update subscription status
            await this.subscriptionsService.updatePaymentStatus(externalReference, String(paymentId), mappedStatus);
            // Record webhook processing for idempotency
            await this.paymentRepository.recordWebhookProcessing(String(paymentId), body.id);
            return { success: true, status: mappedStatus };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error processing webhook: ${errorMessage}`);
            // Return 200 OK to prevent webhook retries on errors
            // Errors should be investigated through logs, not by webhook re-delivery
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
        config_1.ConfigService])
], PaymentsService);
