import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    const plans = await this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });

    return {
      data: plans,
      total: plans.length,
    };
  }

  async subscribeToPlan(userId: string, communityId: string, planId: string) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate community exists
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException('Community not found');
    }

    // Validate plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Check if user is owner of the community
    if (community.ownerId !== userId) {
      throw new BadRequestException(
        'Only community owner can subscribe to plans',
      );
    }

    // Check for existing active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        communityId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException(
        'Community already has an active subscription',
      );
    }

    // Create new subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        communityId,
        planId,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        community: { select: { id: true, name: true } },
        plan: true,
      },
    });

    return {
      message: 'Subscription created successfully',
      subscription,
    };
  }
}
