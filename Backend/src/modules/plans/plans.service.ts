import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return {
      data: plans,
      total: plans.length,
    };
  }

  async getAllPlans() {
    const plans = await this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });

    return {
      data: plans,
      total: plans.length,
    };
  }

  async subscribeToPlan(userId: string, groupId: string, planId: string) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Validate plan exists and is active
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or is inactive');
    }

    // Check if user is owner of the group
    if (group.createdById !== userId) {
      throw new BadRequestException(
        'Only group owner can subscribe to plans',
      );
    }

    // Check for existing active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        groupId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException(
        'Group already has an active subscription',
      );
    }

    // Create new subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        groupId,
        planId,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
        plan: true,
      },
    });

    return {
      message: 'Subscription created successfully',
      subscription,
    };
  }

  async getUserPlans(userId: string) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all subscriptions for this user with plan details
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
        group: { select: { id: true, name: true, photoUrl: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: subscriptions,
      total: subscriptions.length,
    };
  }

  async cancelUserSubscription(userId: string) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find active subscription for this user
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        isActive: true,
      },
      include: {
        plan: true,
        group: { select: { id: true, name: true } },
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException(
        'No active subscription found for this user',
      );
    }

    // Update subscription to cancelled
    const cancelledSubscription = await this.prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: {
        isActive: false,
        status: 'REJECTED',
        expiresAt: new Date(),
      },
      include: {
        plan: true,
        group: { select: { id: true, name: true } },
      },
    });

    return {
      message: 'Subscription cancelled successfully',
      subscription: cancelledSubscription,
    };
  }

  async getActivePlan(userId: string) {
    const now = new Date();

    // Buscar a assinatura ativa (isActive = true, status = APPROVED, não expirou)
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        status: 'APPROVED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: subscription.plan.id, // UUID do plano do backend
        planId: subscription.plan.name, // ID amigável
        expiresAt: subscription.expiresAt,
        startedAt: subscription.createdAt,
        userId: subscription.userId,
        status: 'active',
        planName: subscription.plan.name,
        type: subscription.plan.type,
        price: subscription.plan.price,
      },
    };
  }
}
