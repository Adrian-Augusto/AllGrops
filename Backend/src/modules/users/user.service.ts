import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({ include: { createdGroups: true, memberships: true } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        createdGroups: true,
        memberships: true,
        subscriptions: {
          include: { plan: true, group: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate credits information from active subscriptions
    const now = new Date();
    const activeSubscriptions = user.subscriptions.filter(
      (sub) => sub.isActive && sub.status === 'APPROVED' && (!sub.expiresAt || sub.expiresAt > now)
    );

    // Sum up available sponsored slots from active subscriptions
    const totalAvailableSlots = activeSubscriptions.reduce((total, sub) => {
      return total + (sub.plan?.maxSponsoredGroups || 0);
    }, 0);

    // Count how many groups are currently using sponsored slots
    const usedSlots = activeSubscriptions.filter((sub) => sub.groupId).length;

    // Available slots to use
    const availableSlots = totalAvailableSlots - usedSlots;

    return {
      ...user,
      credits: {
        available: availableSlots,
        used: usedSlots,
        total: totalAvailableSlots,
        activeSubscriptions: activeSubscriptions.map((sub) => ({
          id: sub.id,
          planName: sub.plan?.name,
          groupName: sub.group?.name || 'Conta Premium',
          expiresAt: sub.expiresAt,
          status: sub.status,
        })),
      },
    };
  }
}
