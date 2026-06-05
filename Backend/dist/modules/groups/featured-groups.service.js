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
var FeaturedGroupsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturedGroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let FeaturedGroupsService = FeaturedGroupsService_1 = class FeaturedGroupsService {
    prisma;
    logger = new common_1.Logger(FeaturedGroupsService_1.name);
    rotationInterval;
    constructor(prisma) {
        this.prisma = prisma;
    }
    onModuleInit() {
        // Scheduler automático desabilitado - agora é manual
        this.logger.log('⏰ Scheduler de destaque desabilitado - modo manual ativado');
    }
    /**
     * Rotaciona grupos em destaque a cada 3 horas
     * Prioriza grupos com planos ativos (subscriptions APPROVED)
     */
    async rotateFeaturedGroups() {
        try {
            this.logger.log('🔄 Iniciando rotação de grupos destaque...');
            // 1. Buscar todos os grupos ativos e aprovados com planos ativos (subscriptions APPROVED)
            const now = new Date();
            const groupsWithActivePlans = await this.prisma.group.findMany({
                where: {
                    status: 'APPROVED',
                    subscriptions: {
                        some: {
                            isActive: true,
                            status: 'APPROVED',
                            expiresAt: { gt: now }
                        },
                    },
                },
                include: {
                    subscriptions: {
                        where: { isActive: true, status: 'APPROVED', expiresAt: { gt: now } },
                        include: { plan: true },
                    },
                    _count: { select: { memberships: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`✅ Encontrados ${groupsWithActivePlans.length} grupos com planos ativos`);
            // 2. Desativar todos os featured
            const previousFeatured = await this.prisma.group.findMany({
                where: { isFeatured: true },
                select: { id: true, name: true },
            });
            if (previousFeatured.length > 0) {
                await this.prisma.group.updateMany({
                    where: { isFeatured: true },
                    data: { isFeatured: false },
                });
                this.logger.log(`❌ Desativados ${previousFeatured.length} grupos do destaque`);
            }
            // Shuffle groups with active plans to rotate them dynamically and fairly
            const shuffledGroups = [...groupsWithActivePlans];
            for (let i = shuffledGroups.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledGroups[i], shuffledGroups[j]] = [shuffledGroups[j], shuffledGroups[i]];
            }
            // 3. Ativar próximos em destaque (próximos 5 grupos da lista embaralhada)
            const newFeaturedCount = Math.min(5, shuffledGroups.length);
            const newFeaturedIds = shuffledGroups
                .slice(0, newFeaturedCount)
                .map((g) => g.id);
            if (newFeaturedIds.length > 0) {
                await this.prisma.group.updateMany({
                    where: { id: { in: newFeaturedIds } },
                    data: { isFeatured: true },
                });
                const newFeatured = await this.prisma.group.findMany({
                    where: { id: { in: newFeaturedIds } },
                    select: { id: true, name: true, isFeatured: true },
                });
                this.logger.log(`⭐ Ativados ${newFeatured.length} grupos no destaque`);
                return {
                    previousFeatured,
                    newFeatured,
                    totalWithActivePlans: groupsWithActivePlans.length,
                };
            }
            return {
                previousFeatured,
                newFeatured: [],
                totalWithActivePlans: groupsWithActivePlans.length,
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Erro ao rotacionar destaque: ${msg}`);
            throw error;
        }
    }
    /**
     * Retorna grupos atualmente em destaque
     */
    async getFeaturedGroups() {
        return this.prisma.group.findMany({
            where: { isFeatured: true },
            include: {
                createdBy: { select: { name: true, email: true } },
                subscriptions: { include: { plan: true } },
                _count: { select: { memberships: true, posts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Turbina (destaca) manualmente um grupo específico
     * Valida se o usuário tem plano ativo e não excedeu o limite
     */
    async featureGroupManually(userId, groupId) {
        // Verificar se o grupo existe e pertence ao usuário (IDOR protection)
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            select: { id: true, name: true, createdById: true, status: true },
        });
        if (!group) {
            throw new common_1.BadRequestException('Grupo não encontrado');
        }
        if (group.createdById !== userId) {
            this.logger.warn(`Acesso negado: usuário ${userId} tentou turbinar grupo ${groupId} de outro dono`);
            throw new common_1.BadRequestException('Acesso negado');
        }
        if (group.status !== 'APPROVED') {
            throw new common_1.BadRequestException('Apenas grupos aprovados e ativos podem ser destacados/turbinados');
        }
        // Verificar se o usuário tem plano ativo (qualquer subscription APPROVED e isActive)
        const activeSubscription = await this.prisma.subscription.findFirst({
            where: {
                userId,
                status: 'APPROVED',
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!activeSubscription) {
            throw new common_1.BadRequestException('Plano ativo necessário');
        }
        // Verificar limite de grupos turbinados do plano
        const plan = activeSubscription.plan;
        const maxSponsoredGroups = plan.maxSponsoredGroups || 0;
        if (maxSponsoredGroups === 0) {
            throw new common_1.BadRequestException('Plano não permite turbinar grupos');
        }
        // Usar transação para evitar race condition
        const result = await this.prisma.$transaction(async (tx) => {
            // Contar quantos grupos do usuário já estão em destaque
            const userFeaturedCount = await tx.group.count({
                where: {
                    createdById: userId,
                    isFeatured: true,
                },
            });
            if (userFeaturedCount >= maxSponsoredGroups) {
                throw new common_1.BadRequestException('Limite de grupos turbinados atingido');
            }
            // Turbinar o grupo
            const updatedGroup = await tx.group.update({
                where: { id: groupId },
                data: { isFeatured: true },
                select: { id: true, name: true, isFeatured: true },
            });
            return { updatedGroup, userFeaturedCount };
        });
        this.logger.log(`Grupo turbinado: ${groupId}`);
        return {
            message: 'Grupo turbinado com sucesso',
            group: result.updatedGroup,
            remainingSlots: maxSponsoredGroups - result.userFeaturedCount - 1,
            planName: plan.name,
            maxSponsoredGroups,
        };
    }
    /**
     * Remove o destaque de um grupo
     */
    async unfeatureGroupManually(userId, groupId) {
        // Verificar se o grupo existe e pertence ao usuário (IDOR protection)
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            select: { id: true, createdById: true },
        });
        if (!group) {
            throw new common_1.BadRequestException('Grupo não encontrado');
        }
        if (group.createdById !== userId) {
            this.logger.warn(`Acesso negado: usuário ${userId} tentou remover destaque de grupo ${groupId} de outro dono`);
            throw new common_1.BadRequestException('Acesso negado');
        }
        const updatedGroup = await this.prisma.group.update({
            where: { id: groupId },
            data: { isFeatured: false },
            select: { id: true, isFeatured: true },
        });
        this.logger.log(`Destaque removido: ${groupId}`);
        return {
            message: 'Destaque removido com sucesso',
            group: updatedGroup,
        };
    }
    /**
     * Para o scheduler (útil para testes ou shutdown)
     */
    stopScheduler() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.logger.log('⏹️  Scheduler de destaque parado');
        }
    }
};
exports.FeaturedGroupsService = FeaturedGroupsService;
exports.FeaturedGroupsService = FeaturedGroupsService = FeaturedGroupsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeaturedGroupsService);
