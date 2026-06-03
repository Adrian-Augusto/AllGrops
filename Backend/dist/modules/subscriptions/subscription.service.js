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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SubscriptionsService = class SubscriptionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
            include: { plan: true },
        });
        if (!existingSubscription) {
            throw new common_1.NotFoundException('Subscription not found for reference');
        }
        // Calculate expiresAt if APPROVED
        let expiresAt = null;
        if (status === 'APPROVED' && existingSubscription.plan) {
            const now = new Date();
            expiresAt = new Date(now.getTime() + existingSubscription.plan.durationDays * 24 * 60 * 60 * 1000);
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
        return subscription;
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
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
