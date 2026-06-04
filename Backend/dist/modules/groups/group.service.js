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
var GroupsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const group_merging_1 = require("./utils/group-merging");
const category_service_1 = require("./services/category.service");
const subscription_limits_service_1 = require("../subscriptions/services/subscription-limits.service");
let GroupsService = GroupsService_1 = class GroupsService {
    prisma;
    mailService;
    categoryService;
    subscriptionLimitsService;
    logger = new common_1.Logger(GroupsService_1.name);
    sponsoredCache = new Map();
    constructor(prisma, mailService, categoryService, subscriptionLimitsService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.categoryService = categoryService;
        this.subscriptionLimitsService = subscriptionLimitsService;
    }
    // USER ENDPOINTS
    async createGroup(userId, data) {
        if (!userId || !data.title) {
            throw new common_1.BadRequestException('Missing required fields: userId, title');
        }
        try {
            // Verificar se usuário pode patrocinar (informar no response)
            const sponsorshipInfo = await this.subscriptionLimitsService.canSponsorGroup(userId);
            // Buscar ou criar categoria automaticamente
            const category = await this.categoryService.findOrCreate(data.category);
            const group = await this.prisma.group.create({
                data: {
                    name: data.title,
                    description: data.description,
                    link: data.link,
                    platform: data.platform,
                    photoUrl: data.photoUrl,
                    categoryId: category?.id || null,
                    createdById: userId,
                    status: 'PENDING',
                },
                include: {
                    createdBy: { select: { id: true, name: true, email: true } },
                    category: true,
                },
            });
            return {
                ...group,
                sponsorshipInfo,
            };
        }
        catch (error) {
            this.logger.error('Erro ao criar grupo:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new common_1.BadRequestException(`Failed to create group: ${errorMessage}`);
        }
    }
    async findApproved(categoryId, page = 1, limit = 10) {
        const baseWhere = {
            status: 'APPROVED',
            ...(categoryId && { categoryId }),
        };
        const cacheKey = categoryId || 'all';
        const cached = this.sponsoredCache.get(cacheKey);
        const nowTime = Date.now();
        const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
        let sponsoredList;
        if (cached && (nowTime - cached.timestamp < CACHE_TTL)) {
            sponsoredList = cached.groups;
        }
        else {
            const now = new Date();
            const sponsoredGroups = await this.prisma.group.findMany({
                where: {
                    ...baseWhere,
                    subscriptions: {
                        some: {
                            isActive: true,
                            status: 'APPROVED',
                            expiresAt: { gt: now }
                        }
                    }
                },
                include: {
                    createdBy: { select: { id: true, name: true, email: true } },
                    category: true,
                    memberships: true,
                    subscriptions: {
                        where: {
                            isActive: true,
                            status: 'APPROVED',
                        },
                        include: { plan: true },
                    },
                },
                orderBy: { createdAt: 'desc' }
            });
            sponsoredList = this.shuffleArray(sponsoredGroups);
            this.sponsoredCache.set(cacheKey, {
                timestamp: nowTime,
                groups: sponsoredList
            });
        }
        // Buscar grupos gratuitos (não patrocinados)
        const now = new Date();
        const freeList = await this.prisma.group.findMany({
            where: {
                ...baseWhere,
                NOT: {
                    subscriptions: {
                        some: {
                            isActive: true,
                            status: 'APPROVED',
                            expiresAt: { gt: now }
                        }
                    }
                }
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
                memberships: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        const { groups, total } = (0, group_merging_1.mergeGroupsByFeatureStatus)(sponsoredList, freeList, limit, page);
        return {
            data: groups,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    async findMyGroups(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        return this.prisma.group.findMany({
            where: { createdById: userId },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
                memberships: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
                memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
                posts: true,
            },
        });
        if (!group) {
            throw new common_1.NotFoundException('Grupo não encontrado');
        }
        // Se não é aprovado e o usuário não é o criador, não retorna
        if (group.status !== 'APPROVED' && group.createdById !== userId) {
            throw new common_1.NotFoundException('Você não tem permissão para visualizar este grupo');
        }
        return group;
    }
    async joinGroup(userId, groupId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException('Grupo não encontrado');
        }
        if (group.status !== 'APPROVED') {
            throw new common_1.ForbiddenException('Você pode se juntar apenas a grupos aprovados');
        }
        return this.prisma.membership.upsert({
            where: { userId_groupId: { userId, groupId } },
            update: {},
            create: {
                userId,
                groupId,
                role: 'MEMBER',
            },
        });
    }
    // ADMIN ENDPOINTS
    async findPending(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        return this.prisma.group.findMany({
            where: { status: 'PENDING' },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
                memberships: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'asc' },
        });
    }
    async findAll(status, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = {};
        if (status && ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].includes(status)) {
            where.status = status;
        }
        return this.prisma.group.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                reviewedBy: { select: { id: true, name: true, email: true } },
                category: true,
                memberships: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
    }
    async approveGroup(groupId, adminId) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException('Grupo não encontrado');
        }
        const updatedGroup = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                status: 'APPROVED',
                reviewedById: adminId,
                reviewedAt: new Date(),
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                reviewedBy: { select: { id: true, name: true, email: true } },
            },
        });
        // Enviar email de aprovação (não quebra a request se falhar)
        this.mailService.sendGroupStatusEmail(updatedGroup.createdBy.email, updatedGroup.name, 'APPROVED').catch((error) => {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Erro ao enviar email de aprovação: ${msg}`);
        });
        return updatedGroup;
    }
    async rejectGroup(groupId, adminId, reason) {
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group) {
            throw new common_1.NotFoundException('Grupo não encontrado');
        }
        if (!reason) {
            throw new common_1.BadRequestException('Motivo da rejeição é obrigatório');
        }
        const updatedGroup = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                status: 'REJECTED',
                rejectionReason: reason,
                reviewedById: adminId,
                reviewedAt: new Date(),
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                reviewedBy: { select: { id: true, name: true, email: true } },
            },
        });
        // Enviar email de rejeição (não quebra a request se falhar)
        this.mailService.sendGroupStatusEmail(updatedGroup.createdBy.email, updatedGroup.name, 'REJECTED', reason).catch((error) => {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Erro ao enviar email de rejeição: ${msg}`);
        });
        return updatedGroup;
    }
    async getGroupStatistics() {
        const [pending, approved, rejected, total] = await Promise.all([
            this.prisma.group.count({ where: { status: 'PENDING' } }),
            this.prisma.group.count({ where: { status: 'APPROVED' } }),
            this.prisma.group.count({ where: { status: 'REJECTED' } }),
            this.prisma.group.count(),
        ]);
        return {
            pending,
            approved,
            rejected,
            total,
        };
    }
    async getPublicStatistics() {
        const [approved, total] = await Promise.all([
            this.prisma.group.count({ where: { status: 'APPROVED' } }),
            this.prisma.group.count(),
        ]);
        return {
            approved,
            total,
        };
    }
    async deleteGroup(groupId, adminId) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: { createdBy: { select: { email: true, name: true } } },
        });
        if (!group) {
            throw new common_1.NotFoundException('Grupo não encontrado');
        }
        // Deletar relacionamentos primeiro
        await this.prisma.membership.deleteMany({
            where: { groupId },
        });
        await this.prisma.subscription.deleteMany({
            where: { groupId },
        });
        await this.prisma.post.deleteMany({
            where: { groupId },
        });
        // Deletar grupo
        const deletedGroup = await this.prisma.group.delete({
            where: { id: groupId },
        });
        // Enviar email notificando deletção
        this.mailService.sendGroupDeletedEmail(group.createdBy.email, group.name).catch((error) => {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Erro ao enviar email de deleção: ${msg}`);
        });
        return {
            message: `Grupo "${group.name}" foi deletado com sucesso`,
            deletedGroup,
        };
    }
    async updateGroup(groupId, data) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException('Grupo não encontrado');
        }
        // Se status for alterado para APPROVED, resetar para PENDING para reavaliação
        if (data.status === 'APPROVED' && group.status !== 'APPROVED') {
            data.status = 'PENDING';
            data.reviewedById = null;
            data.reviewedAt = null;
        }
        // Map title to name if title is provided (DTO uses title, DB uses name)
        if (data.title !== undefined) {
            data.name = data.title;
            delete data.title;
        }
        // Handle category - if category string is provided, find or create it
        if (data.category !== undefined) {
            const category = await this.categoryService.findOrCreate(data.category);
            data.categoryId = category?.id || null;
            delete data.category;
        }
        const updatedGroup = await this.prisma.group.update({
            where: { id: groupId },
            data,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
            },
        });
        return updatedGroup;
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = GroupsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        category_service_1.CategoryService,
        subscription_limits_service_1.SubscriptionLimitsService])
], GroupsService);
