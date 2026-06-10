import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupsService } from '../groups/group.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
  ) {}

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
    console.log('[AdminService] getGroups called - status:', status);
    const where: any = {};
    
    if (status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
      const normalizedStatus = status.toUpperCase();
      
      if (!validStatuses.includes(normalizedStatus)) {
        throw new BadRequestException(
          `Invalid status. Valid options: ${validStatuses.join(', ')}`,
        );
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

  async approveGroup(groupId: string, adminId: string) {
    if (!groupId) {
      throw new BadRequestException('Group ID is required');
    }
    return this.groupsService.approveGroup(groupId, adminId);
  }

  async rejectGroup(groupId: string, adminId: string, rejectionReason?: string) {
    if (!groupId) {
      throw new BadRequestException('Group ID is required');
    }
    return this.groupsService.rejectGroup(groupId, adminId, rejectionReason || 'Rejected by admin');
  }

  async promoteGroup(groupId: string) {
    if (!groupId) {
      throw new BadRequestException('Group ID is required');
    }

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { isFeatured: true },
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
