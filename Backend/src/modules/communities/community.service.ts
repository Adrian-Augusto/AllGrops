import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunitiesService {
  constructor(private prisma: PrismaService) {}

  async createCommunity(ownerId: string, data: { name: string; description: string; categoryId: string }) {
    return this.prisma.community.create({
      data: {
        ...data,
        ownerId,
      },
    });
  }

  async getAll(categoryId?: string) {
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

  async getOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: {
        owner: true,
        category: true,
        memberships: { include: { user: true } },
      },
    });
    if (!community) {
      throw new NotFoundException('Community not found');
    }
    return community;
  }

  async joinCommunity(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) {
      throw new NotFoundException('Community not found');
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

  async highlightCommunity(ownerId: string, communityId: string, approved: boolean) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) {
      throw new NotFoundException('Community not found');
    }
    if (community.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner can manage this community');
    }
    return this.prisma.community.update({
      where: { id: communityId },
      data: { isFeatured: approved },
    });
  }
}
