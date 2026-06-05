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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    prisma;
    mailService;
    logger = new common_1.Logger(SubscriptionsService_1.name);
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async createSubscription(userId, groupId, planId) {
        // Check for PENDING payment (idempotency - same planId and groupId with status PENDING)
        // This prevents creating duplicate subscriptions during the same payment flow
        const pendingForSamePlan = await this.prisma.subscription.findFirst({
            where: {
                userId,
                planId,
                groupId: groupId === '' ? null : groupId,
                status: 'PENDING',
            },
        });
        // If already PENDING for same plan, reuse it (idempotency)
        if (pendingForSamePlan) {
            return pendingForSamePlan;
        }
        // Allow multiple APPROVED subscriptions (different plans or renewals)
        // Only one active subscription per (userId, groupId, planId) allowed
        const subscription = await this.prisma.subscription.create({
            data: {
                userId,
                groupId: groupId === '' ? null : groupId,
                planId,
                status: 'PENDING',
            },
        });
        return subscription;
    }
    async updatePaymentStatus(externalReference, paymentId, status) {
        // external_reference: userId:planId:subscriptionId
        const parts = externalReference.split(':');
        const subscriptionId = parts[2]; // Last part is always subscriptionId
        // Fetch subscription to get planId for expiration calculation
        const existingSubscription = await this.prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                plan: true,
                user: { select: { id: true, name: true, email: true, credit: true } },
                group: { select: { id: true, name: true } },
            },
        });
        if (!existingSubscription) {
            throw new common_1.NotFoundException('Subscription not found for reference');
        }
        // Calculate expiresAt if APPROVED
        let expiresAt = null;
        if (status === 'APPROVED' && existingSubscription.plan) {
            const now = new Date();
            expiresAt = new Date(now.getTime() + existingSubscription.plan.durationDays * 24 * 60 * 60 * 1000);
            // Add credits based on plan type
            const creditsToAdd = this.getCreditsForPlan(existingSubscription.plan.type);
            if (creditsToAdd > 0) {
                await this.prisma.user.update({
                    where: { id: existingSubscription.userId },
                    data: {
                        credit: {
                            increment: creditsToAdd,
                        },
                    },
                });
                this.logger.log(`✅ Added ${creditsToAdd} credits to user ${existingSubscription.userId} for plan ${existingSubscription.plan.name}`);
            }
        }
        const subscription = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status,
                paymentId,
                isActive: status === 'APPROVED',
                expiresAt,
            },
        });
        // Send email notification when subscription is approved
        if (status === 'APPROVED' && existingSubscription.user?.email) {
            const creditsToAdd = this.getCreditsForPlan(existingSubscription.plan?.type || '');
            const subject = existingSubscription.group
                ? `✅ Patrocínio aprovado para "${existingSubscription.group.name}"!`
                : `✅ Seu plano premium foi ativado!`;
            const message = existingSubscription.group
                ? `Seu grupo "${existingSubscription.group.name}" agora está patrocinado por ${existingSubscription.plan?.durationDays} dias!`
                : `Sua assinatura premium está ativa! Você recebeu ${creditsToAdd} créditos e pode patrocinar até ${existingSubscription.plan?.maxSponsoredGroups} grupos.`;
            try {
                await this.mailService.sendSubscriptionApprovedEmail(existingSubscription.user.email, subject, message, existingSubscription.plan?.name || 'Seu plano');
                this.logger.log(`✅ Email de aprovação enviado para ${existingSubscription.user.email}`);
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.error(`❌ Erro ao enviar email de aprovação de assinatura: ${msg}`);
                // Continue processing even if email fails
            }
        }
        return subscription;
    }
    getCreditsForPlan(planType) {
        // All plans give 1 credit
        return 1;
    }
    async getSubscriptions(userId) {
        return await this.prisma.subscription.findMany({
            where: { userId },
            include: {
                group: { select: { id: true, name: true } },
                plan: true,
            },
        });
    }
    async getGroupSubscriptions(groupId) {
        return await this.prisma.subscription.findMany({
            where: { groupId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                plan: true,
            },
        });
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], SubscriptionsService);
