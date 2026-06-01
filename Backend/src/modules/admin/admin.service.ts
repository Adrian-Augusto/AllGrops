import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const totalCommunities = await this.prisma.community.count();
    const totalSubscriptions = await this.prisma.subscription.count();
    const pendingCommunities = await this.prisma.community.count({
      where: { status: 'PENDING' },
    });
    const totalRevenue = await this.prisma.subscription.aggregate({
      _sum: { plan: { select: { price: true } } },
      where: { status: 'APPROVED' },
    });

    return {
      totalUsers,
      totalCommunities,
      totalSubscriptions,
      pendingCommunities,
      totalRevenue: totalRevenue._sum?.price || 0,
    };
  }

  async getGroups(status?: string) {
    const where: any = {};
    
    if (status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status.toUpperCase())) {
        throw new BadRequestException(
          `Invalid status. Valid options: ${validStatuses.join(', ')}`,
        );
      }
      where.status = status.toUpperCase();
    }

    const communities = await this.prisma.community.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: true,
        _count: { select: { memberships: true } },
      },
    });

    return {
      data: communities,
      total: communities.length,
    };
  }

  async approveCommunity(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    if (community.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve community with status: ${community.status}`,
      );
    }

    return this.prisma.community.update({
      where: { id: communityId },
      data: { status: 'APPROVED' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });
  }

  async rejectCommunity(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    if (community.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject community with status: ${community.status}`,
      );
    }

    return this.prisma.community.update({
      where: { id: communityId },
      data: { status: 'REJECTED' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });
  }
}
