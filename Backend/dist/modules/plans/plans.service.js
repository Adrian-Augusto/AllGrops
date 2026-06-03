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
exports.PlansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PlansService = class PlansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPlans() {
        const plans = await this.prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });
        return {
            data: plans,
            total: plans.length,
        };
    }
    async getAllPlans() {
        const plans = await this.prisma.plan.findMany({
            orderBy: { price: 'asc' },
        });
        return {
            data: plans,
            total: plans.length,
        };
    }
    async subscribeToPlan(userId, groupId, planId) {
        // Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        // Validate group exists
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        // Validate plan exists and is active
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId },
        });
        if (!plan || !plan.isActive) {
            throw new common_1.NotFoundException('Plan not found or is inactive');
        }
        // Check if user is owner of the group
        if (group.createdById !== userId) {
            throw new common_1.BadRequestException('Only group owner can subscribe to plans');
        }
        // Check for existing active subscription
        const existingSubscription = await this.prisma.subscription.findFirst({
            where: {
                userId,
                groupId,
                status: { in: ['PENDING', 'APPROVED'] },
            },
        });
        if (existingSubscription) {
            throw new common_1.BadRequestException('Group already has an active subscription');
        }
        // Create new subscription
        const subscription = await this.prisma.subscription.create({
            data: {
                userId,
                groupId,
                planId,
                status: 'PENDING',
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                group: { select: { id: true, name: true } },
                plan: true,
            },
        });
        return {
            message: 'Subscription created successfully',
            subscription,
        };
    }
    async getUserPlans(userId) {
        // Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        // Get all subscriptions for this user with plan details
        const subscriptions = await this.prisma.subscription.findMany({
            where: { userId },
            include: {
                plan: true,
                group: { select: { id: true, name: true, photoUrl: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            data: subscriptions,
            total: subscriptions.length,
        };
    }
    async cancelUserSubscription(userId) {
        // Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        // Find active subscription for this user
        const activeSubscription = await this.prisma.subscription.findFirst({
            where: {
                userId,
                status: { in: ['PENDING', 'APPROVED'] },
                isActive: true,
            },
            include: {
                plan: true,
                group: { select: { id: true, name: true } },
            },
        });
        if (!activeSubscription) {
            throw new common_1.BadRequestException('No active subscription found for this user');
        }
        // Update subscription to cancelled
        const cancelledSubscription = await this.prisma.subscription.update({
            where: { id: activeSubscription.id },
            data: {
                isActive: false,
                status: 'REJECTED',
                expiresAt: new Date(),
            },
            include: {
                plan: true,
                group: { select: { id: true, name: true } },
            },
        });
        return {
            message: 'Subscription cancelled successfully',
            subscription: cancelledSubscription,
        };
    }
    async getActivePlan(userId) {
        const now = new Date();
        // Buscar a assinatura ativa (isActive = true, status = APPROVED, não expirou)
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                userId,
                isActive: true,
                status: 'APPROVED',
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } },
                ],
            },
            include: {
                plan: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!subscription) {
            return {
                success: true,
                data: null,
            };
        }
        return {
            success: true,
            data: {
                id: subscription.plan.id, // UUID do plano do backend
                planId: subscription.plan.name, // ID amigável
                expiresAt: subscription.expiresAt,
                startedAt: subscription.createdAt,
                userId: subscription.userId,
                status: 'active',
                planName: subscription.plan.name,
                type: subscription.plan.type,
                price: subscription.plan.price,
            },
        };
    }
};
exports.PlansService = PlansService;
exports.PlansService = PlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlansService);
