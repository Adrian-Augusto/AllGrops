import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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
    metadataGroupId?: string,
  ) {
    // external_reference: userId:planId:subscriptionId
    const parts = externalReference.split(':');
    const subscriptionId = parts[2]; // Last part is always subscriptionId

    // Fetch subscription to get planId for expiration calculation
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { 
        plan: true,
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
      },
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
        // Update groupId from metadata if provided and different
        ...(metadataGroupId && existingSubscription.groupId !== metadataGroupId ? { groupId: metadataGroupId } : {}),
      },
    });

    // Set isFeatured: true on group when subscription is approved and has groupId
    if (status === 'APPROVED' && existingSubscription.groupId) {
      await this.prisma.group.update({
        where: { id: existingSubscription.groupId },
        data: { isFeatured: true },
      });
      this.logger.log(`✅ Grupo ${existingSubscription.groupId} marcado como patrocinado (isFeatured: true)`);
    }

    // Send email notification when subscription is approved
    if (status === 'APPROVED' && existingSubscription.user?.email) {
      const subject = existingSubscription.group 
        ? `✅ Patrocínio aprovado para "${existingSubscription.group.name}"!`
        : `✅ Seu plano premium foi ativado!`;
      
      const message = existingSubscription.group
        ? `Seu grupo "${existingSubscription.group.name}" agora está patrocinado por ${existingSubscription.plan?.durationDays} dias!`
        : `Sua assinatura premium está ativa! Você pode patrocinar até ${existingSubscription.plan?.maxSponsoredGroups} grupos.`;
      
      try {
        await this.mailService.sendSubscriptionApprovedEmail(
          existingSubscription.user.email,
          subject,
          message,
          existingSubscription.plan?.name || 'Seu plano',
        );
        this.logger.log(`✅ Email de aprovação enviado para ${existingSubscription.user.email}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ Erro ao enviar email de aprovação de assinatura: ${msg}`);
        // Continue processing even if email fails
      }
    }

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
