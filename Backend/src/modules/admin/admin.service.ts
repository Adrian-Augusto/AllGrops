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
    
    // Fetch approved subscriptions with plan data to calculate revenue
    const approvedSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'APPROVED' },
      include: { plan: true },
    });
    
    // Calculate total revenue by summing plan prices
    const totalRevenue = approvedSubscriptions.reduce(
      (sum, subscription) => sum + subscription.plan.price,
      0,
    );

    return {
      totalUsers,
      totalGroups,
      totalSubscriptions,
      pendingGroups,
      totalRevenue,
    };
  }

  async getGroups(status?: string) {
    const where: any = {};
    
    if (status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
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
        createdBy: { select: { id: true, name: true, email: true } },
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
        createdBy: { select: { id: true, name: true, email: true } },
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
}
