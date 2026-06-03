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
var PaymentRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const uuid_1 = require("uuid");
let PaymentRepository = PaymentRepository_1 = class PaymentRepository {
    prisma;
    logger = new common_1.Logger(PaymentRepository_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPayment(data) {
        try {
            // Check if payment already exists for this subscription (idempotency)
            const existingPayment = await this.prisma.payment.findUnique({
                where: { subscriptionId: data.subscriptionId },
            });
            if (existingPayment) {
                this.logger.log(`Payment already exists for subscription: ${data.subscriptionId}`);
                return existingPayment;
            }
            const payment = await this.prisma.payment.create({
                data: {
                    subscriptionId: data.subscriptionId,
                    idempotencyKey: data.idempotencyKey,
                    externalReference: data.externalReference,
                    status: 'PENDING',
                },
            });
            return payment;
        }
        catch (error) {
            // Handle unique constraint violation for subscriptionId
            if (error.code === 'P2002' && error.meta?.target?.includes('subscriptionId')) {
                this.logger.warn(`Payment already exists for subscription: ${data.subscriptionId}`);
                // Return existing payment
                return await this.prisma.payment.findUnique({
                    where: { subscriptionId: data.subscriptionId },
                });
            }
            throw error;
        }
    }
    async findByIdempotencyKey(idempotencyKey) {
        return this.prisma.payment.findUnique({
            where: { idempotencyKey },
            include: { subscription: true },
        });
    }
    async updatePaymentStatus(paymentId, mercadoPagoId, status) {
        return this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                mercadoPagoId,
                status,
                webhookProcessed: true,
                updatedAt: new Date(),
            },
        });
    }
    async findByMercadoPagoId(mercadoPagoId) {
        return this.prisma.payment.findUnique({
            where: { mercadoPagoId },
        });
    }
    async findByExternalReference(externalReference) {
        return this.prisma.payment.findFirst({
            where: { externalReference },
            include: { subscription: true },
        });
    }
    async hasProcessedWebhook(paymentId, webhookId) {
        const payment = await this.prisma.payment.findUnique({
            where: { mercadoPagoId: paymentId },
        });
        return payment?.lastWebhookId === webhookId;
    }
    async recordWebhookProcessing(paymentId, webhookId) {
        return this.prisma.payment.update({
            where: { mercadoPagoId: paymentId },
            data: {
                lastWebhookId: webhookId,
                updatedAt: new Date(),
            },
        });
    }
    // Generate idempotency key for new premium plan subscriptions
    generateIdempotencyKey(userId, planId) {
        return `${userId}:${planId}:${(0, uuid_1.v4)()}`;
    }
};
exports.PaymentRepository = PaymentRepository;
exports.PaymentRepository = PaymentRepository = PaymentRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentRepository);
