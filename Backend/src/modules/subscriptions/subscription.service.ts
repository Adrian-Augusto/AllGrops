import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async createSubscription(userId: string, communityId: string, planId: string) {
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        communityId,
        planId,
        status: 'PENDING',
      },
    });
    return subscription;
  }

  async updatePaymentStatus(externalReference: string, paymentId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') {
    const [userId, communityId, planId] = externalReference.split(':');
    const subscription = await this.prisma.subscription.updateMany({
      where: { userId, communityId, planId },
      data: { status, paymentId },
    });
    if (subscription.count === 0) {
      throw new NotFoundException('Subscription not found for reference');
    }
    return subscription;
  }
}
