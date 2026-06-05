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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = AdminService_1 = class AdminService {
    prisma;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats() {
        const totalUsers = await this.prisma.user.count();
        const totalGroups = await this.prisma.group.count();
        const totalSubscriptions = await this.prisma.subscription.count();
        const pendingGroups = await this.prisma.group.count({
            where: { status: 'PENDING' },
        });
        // Fetch approved subscriptions with plan data to calculate revenue
        const approvedSubscriptions = await this.prisma.subscription.findMany({
            where: { status: 'APPROVED' },
            include: { plan: true },
        });
        // Calculate total revenue by summing plan prices
        const totalRevenue = approvedSubscriptions.reduce((sum, subscription) => sum + subscription.plan.price, 0);
        return {
            totalUsers,
            totalGroups,
            totalSubscriptions,
            pendingGroups,
            totalRevenue,
        };
    }
    async getGroups(status) {
        console.log('[AdminService] getGroups called - status:', status);
        const where = {};
        if (status) {
            const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
            const normalizedStatus = status.toUpperCase();
            if (!validStatuses.includes(normalizedStatus)) {
                throw new common_1.BadRequestException(`Invalid status. Valid options: ${validStatuses.join(', ')}`);
            }
            where.status = normalizedStatus;
        }
        console.log('[AdminService] Querying groups with where:', where);
        const groups = await this.prisma.group.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
                _count: { select: { memberships: true } },
            },
        });
        console.log('[AdminService] Found groups:', groups.length);
        return {
            data: groups,
            total: groups.length,
        };
    }
    async approveGroup(groupId) {
        if (!groupId) {
            throw new common_1.BadRequestException('Group ID is required');
        }
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        if (group.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot approve group with status: ${group.status}`);
        }
        return this.prisma.group.update({
            where: { id: groupId },
            data: { status: 'APPROVED' },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
            },
        });
    }
    async rejectGroup(groupId, rejectionReason) {
        if (!groupId) {
            throw new common_1.BadRequestException('Group ID is required');
        }
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        if (group.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot reject group with status: ${group.status}`);
        }
        return this.prisma.group.update({
            where: { id: groupId },
            data: {
                status: 'REJECTED',
                rejectionReason: rejectionReason || 'Rejected by admin',
            },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                category: true,
            },
        });
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
    async getOnlineUsersCount() {
        // Usuários online = últimos 15 minutos de atividade
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const onlineCount = await this.prisma.user.count({
            where: {
                lastActivityAt: {
                    gte: fifteenMinutesAgo,
                },
            },
        });
        return {
            onlineUsers: onlineCount,
            threshold: '15 minutes',
            timestamp: new Date(),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
