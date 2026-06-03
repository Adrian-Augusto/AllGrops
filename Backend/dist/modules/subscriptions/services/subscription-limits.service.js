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
exports.SubscriptionLimitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SubscriptionLimitsService = class SubscriptionLimitsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Obtém o plano mais vantajoso do usuário
     */
    async getHighestPlan(userId) {
        const subscriptions = await this.prisma.subscription.findMany({
            where: {
                userId,
                status: 'APPROVED',
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            include: { plan: true },
            orderBy: { plan: { maxSponsoredGroups: 'desc' } },
            take: 1,
        });
        return subscriptions[0]?.plan || null;
    }
    /**
     * Obtém os limites de patrocínio do usuário
     */
    async getUserPlanLimits(userId) {
        const plan = await this.getHighestPlan(userId);
        return {
            maxSponsoredGroups: plan?.maxSponsoredGroups || 0,
            canSponsor: (plan?.maxSponsoredGroups || 0) > 0,
        };
    }
    /**
     * Valida se o usuário pode patrocinar mais um grupo
     * Retorna se pode patrocinar ou não
     */
    async canSponsorGroup(userId) {
        const limits = await this.getUserPlanLimits(userId);
        const activeSponsoredCount = await this.getActiveSponsoredGroupsCount(userId);
        return {
            canSponsor: activeSponsoredCount < limits.maxSponsoredGroups,
            activeSponsoredCount,
            maxAllowed: limits.maxSponsoredGroups,
        };
    }
    /**
     * Conta quantos grupos patrocinados o usuário tem ativos
     */
    async getActiveSponsoredGroupsCount(userId) {
        return await this.prisma.group.count({
            where: {
                createdById: userId,
                OR: [
                    { isFeatured: true },
                    {
                        subscriptions: {
                            some: {
                                isActive: true,
                                status: 'APPROVED',
                                userId: userId,
                                expiresAt: { gt: new Date() },
                            },
                        },
                    },
                ],
            },
        });
    }
    /**
     * Remove patrocínio de grupos quando subscrição expira
     */
    async expireGroupSponsorships() {
        const now = new Date();
        const expiredSubscriptions = await this.prisma.subscription.updateMany({
            where: {
                isActive: true,
                expiresAt: { lt: now },
            },
            data: {
                isActive: false,
            },
        });
        return expiredSubscriptions.count;
    }
    /**
     * Retorna informações do plano do usuário
     */
    async getUserSubscriptionInfo(userId) {
        const limits = await this.getUserPlanLimits(userId);
        const sponsoredCount = await this.getActiveSponsoredGroupsCount(userId);
        return {
            canSponsor: limits.canSponsor,
            sponsoredGroups: {
                active: sponsoredCount,
                max: limits.maxSponsoredGroups,
                remaining: Math.max(0, limits.maxSponsoredGroups - sponsoredCount),
            },
        };
    }
};
exports.SubscriptionLimitsService = SubscriptionLimitsService;
exports.SubscriptionLimitsService = SubscriptionLimitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionLimitsService);
