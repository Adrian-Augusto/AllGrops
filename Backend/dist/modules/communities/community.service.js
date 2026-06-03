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
exports.CommunitiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CommunitiesService = class CommunitiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCommunity(ownerId, data) {
        return this.prisma.community.create({
            data: {
                ...data,
                ownerId,
            },
        });
    }
    async getAll(categoryId) {
        const where = categoryId ? { categoryId } : undefined;
        return this.prisma.community.findMany({
            where,
            include: {
                owner: true,
                category: true,
                memberships: true,
            },
        });
    }
    async getOne(id) {
        const community = await this.prisma.community.findUnique({
            where: { id },
            include: {
                owner: true,
                category: true,
                memberships: { include: { user: true } },
            },
        });
        if (!community) {
            throw new common_1.NotFoundException('Community not found');
        }
        return community;
    }
    async joinCommunity(userId, communityId) {
        const community = await this.prisma.community.findUnique({ where: { id: communityId } });
        if (!community) {
            throw new common_1.NotFoundException('Community not found');
        }
        return this.prisma.membership.upsert({
            where: { userId_communityId: { userId, communityId } },
            update: {},
            create: {
                userId,
                communityId,
                role: 'MEMBER',
            },
        });
    }
    async highlightCommunity(ownerId, communityId, approved) {
        const community = await this.prisma.community.findUnique({ where: { id: communityId } });
        if (!community) {
            throw new common_1.NotFoundException('Community not found');
        }
        if (community.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('Only owner can manage this community');
        }
        return this.prisma.community.update({
            where: { id: communityId },
            data: { isFeatured: approved },
        });
    }
};
exports.CommunitiesService = CommunitiesService;
exports.CommunitiesService = CommunitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommunitiesService);
