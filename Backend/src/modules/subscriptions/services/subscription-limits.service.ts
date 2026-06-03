import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface PlanLimits {
  maxSponsoredGroups: number;
  canSponsor: boolean;
}

@Injectable()
export class SubscriptionLimitsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtém o plano mais vantajoso do usuário
   */
  async getHighestPlan(userId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: 'APPROVED',
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: { plan: true },
      orderBy: { plan: { maxSponsoredGroups: 'desc' } },
      take: 1,
    });

    return subscriptions[0]?.plan || null;
  }

  /**
   * Obtém os limites de patrocínio do usuário
   */
  async getUserPlanLimits(userId: string): Promise<PlanLimits> {
    const plan = await this.getHighestPlan(userId);
    return {
      maxSponsoredGroups: plan?.maxSponsoredGroups || 0,
      canSponsor: (plan?.maxSponsoredGroups || 0) > 0,
    };
  }

  /**
   * Valida se o usuário pode patrocinar mais um grupo
   * Retorna se pode patrocinar ou não
   */
  async canSponsorGroup(userId: string): Promise<{ canSponsor: boolean; activeSponsoredCount: number; maxAllowed: number }> {
    const limits = await this.getUserPlanLimits(userId);
    const activeSponsoredCount = await this.getActiveSponsoredGroupsCount(userId);

    return {
      canSponsor: activeSponsoredCount < limits.maxSponsoredGroups,
      activeSponsoredCount,
      maxAllowed: limits.maxSponsoredGroups,
    };
  }

  /**
   * Conta quantos grupos patrocinados o usuário tem ativos
   */
  async getActiveSponsoredGroupsCount(userId: string): Promise<number> {
    return await this.prisma.group.count({
      where: {
        createdById: userId,
        OR: [
          { isFeatured: true },
          {
            subscriptions: {
              some: {
                isActive: true,
                status: 'APPROVED',
                userId: userId,
                expiresAt: { gt: new Date() },
              },
            },
          },
        ],
      },
    });
  }

  /**
   * Remove patrocínio de grupos quando subscrição expira
   */
  async expireGroupSponsorships(): Promise<number> {
    const now = new Date();
    const expiredSubscriptions = await this.prisma.subscription.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: now },
      },
      data: {
        isActive: false,
      },
    });

    return expiredSubscriptions.count;
  }

  /**
   * Retorna informações do plano do usuário
   */
  async getUserSubscriptionInfo(userId: string) {
    const limits = await this.getUserPlanLimits(userId);
    const sponsoredCount = await this.getActiveSponsoredGroupsCount(userId);

    return {
      canSponsor: limits.canSponsor,
      sponsoredGroups: {
        active: sponsoredCount,
        max: limits.maxSponsoredGroups,
        remaining: Math.max(0, limits.maxSponsoredGroups - sponsoredCount),
      },
    };
  }
}
