import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const totalGroups = await this.prisma.group.count();
    const totalSubscriptions = await this.prisma.subscription.count();
    const pendingGroups = await this.prisma.group.count({
      where: { status: 'PENDING' },
    });
    const totalRevenue = await this.prisma.subscription.aggregate({
      _sum: { plan: { select: { price: true } } },
      where: { status: 'APPROVED' },
    });

    return {
      totalUsers,
      totalGroups,
      totalSubscriptions,
      pendingGroups,
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

    const groups = await this.prisma.group.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: true,
        _count: { select: { memberships: true } },
      },
    });

    return {
      data: groups,
      total: groups.length,
    };
  }

  async approveGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve group with status: ${group.status}`,
      );
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { status: 'APPROVED' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });
  }

  async rejectGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject group with status: ${group.status}`,
      );
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { status: 'REJECTED' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });
  }
}
