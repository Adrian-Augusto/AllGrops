import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async createSubscription(userId: string, groupId: string | undefined, planId: string) {
    // Check for PENDING payment (idempotency - same planId and groupId with status PENDING)
    // This prevents creating duplicate subscriptions during the same payment flow
    const pendingForSamePlan = await this.prisma.subscription.findFirst({
      where: {
        userId,
        planId,
        groupId: groupId === '' ? null : groupId,
        status: 'PENDING',
      },
    });

    // If already PENDING for same plan, reuse it (idempotency)
    if (pendingForSamePlan) {
      return pendingForSamePlan;
    }

    // Allow multiple APPROVED subscriptions (different plans or renewals)
    // Only one active subscription per (userId, groupId, planId) allowed

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        groupId: groupId === '' ? null : groupId,
        planId,
        status: 'PENDING',
      },
    });
    return subscription;
  }

  async updatePaymentStatus(
    externalReference: string,
    paymentId: string,
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
  ) {
    // external_reference: userId:planId:subscriptionId
    const parts = externalReference.split(':');
    const subscriptionId = parts[2]; // Last part is always subscriptionId

    // Fetch subscription to get planId for expiration calculation
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!existingSubscription) {
      throw new NotFoundException('Subscription not found for reference');
    }

    // Calculate expiresAt if APPROVED
    let expiresAt: Date | null = null;
    if (status === 'APPROVED' && existingSubscription.plan) {
      const now = new Date();
      expiresAt = new Date(now.getTime() + existingSubscription.plan.durationDays * 24 * 60 * 60 * 1000);
    }

    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        paymentId,
        isActive: status === 'APPROVED',
        expiresAt,
      },
    });

    return subscription;
  }

  async getSubscriptions(userId: string) {
    return await this.prisma.subscription.findMany({
      where: { userId },
      include: {
        group: { select: { id: true, name: true } },
        plan: true,
      },
    });
  }

  async getGroupSubscriptions(groupId: string) {
    return await this.prisma.subscription.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
      },
    });
  }
}
