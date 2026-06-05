import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeaturedGroupsService implements OnModuleInit {
  private readonly logger = new Logger(FeaturedGroupsService.name);
  private rotationInterval: NodeJS.Timeout | undefined;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Scheduler automático desabilitado - agora é manual
    this.logger.log('⏰ Scheduler de destaque desabilitado - modo manual ativado');
  }

  /**
   * Rotaciona grupos em destaque a cada 3 horas
   * Prioriza grupos com planos ativos (subscriptions APPROVED)
   */
  async rotateFeaturedGroups(): Promise<{
    previousFeatured: any[];
    newFeatured: any[];
    totalWithActivePlans: number;
  }> {
    try {
      this.logger.log('🔄 Iniciando rotação de grupos destaque...');

      // 1. Buscar todos os grupos ativos e aprovados com planos ativos (subscriptions APPROVED)
      const now = new Date();
      const groupsWithActivePlans = await this.prisma.group.findMany({
        where: {
          status: 'APPROVED',
          subscriptions: {
            some: {
              isActive: true,
              status: 'APPROVED',
              expiresAt: { gt: now }
            },
          },
        },
        include: {
          subscriptions: {
            where: { isActive: true, status: 'APPROVED', expiresAt: { gt: now } },
            include: { plan: true },
          },
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(`✅ Encontrados ${groupsWithActivePlans.length} grupos com planos ativos`);

      // 2. Desativar todos os featured
      const previousFeatured = await this.prisma.group.findMany({
        where: { isFeatured: true },
        select: { id: true, name: true },
      });

      if (previousFeatured.length > 0) {
        await this.prisma.group.updateMany({
          where: { isFeatured: true },
          data: { isFeatured: false },
        });
        this.logger.log(`❌ Desativados ${previousFeatured.length} grupos do destaque`);
      }

      // Shuffle groups with active plans to rotate them dynamically and fairly
      const shuffledGroups = [...groupsWithActivePlans];
      for (let i = shuffledGroups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledGroups[i], shuffledGroups[j]] = [shuffledGroups[j], shuffledGroups[i]];
      }

      // 3. Ativar próximos em destaque (próximos 5 grupos da lista embaralhada)
      const newFeaturedCount = Math.min(5, shuffledGroups.length);
      const newFeaturedIds = shuffledGroups
        .slice(0, newFeaturedCount)
        .map((g) => g.id);

      if (newFeaturedIds.length > 0) {
        await this.prisma.group.updateMany({
          where: { id: { in: newFeaturedIds } },
          data: { isFeatured: true },
        });

        const newFeatured = await this.prisma.group.findMany({
          where: { id: { in: newFeaturedIds } },
          select: { id: true, name: true, isFeatured: true },
        });

        this.logger.log(`⭐ Ativados ${newFeatured.length} grupos no destaque`);

        return {
          previousFeatured,
          newFeatured,
          totalWithActivePlans: groupsWithActivePlans.length,
        };
      }

      return {
        previousFeatured,
        newFeatured: [],
        totalWithActivePlans: groupsWithActivePlans.length,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro ao rotacionar destaque: ${msg}`);
      throw error;
    }
  }

  /**
   * Retorna grupos atualmente em destaque
   */
  async getFeaturedGroups() {
    return this.prisma.group.findMany({
      where: { isFeatured: true },
      include: {
        createdBy: { select: { name: true, email: true } },
        subscriptions: { include: { plan: true } },
        _count: { select: { memberships: true, posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Turbina (destaca) manualmente um grupo específico
   * Valida se o usuário tem plano ativo e não excedeu o limite
   */
  async featureGroupManually(userId: string, groupId: string) {
    // Verificar se o grupo existe e pertence ao usuário (IDOR protection)
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, createdById: true, status: true },
    });

    if (!group) {
      throw new BadRequestException('Grupo não encontrado');
    }

    if (group.createdById !== userId) {
      this.logger.warn(`Acesso negado: usuário ${userId} tentou turbinar grupo ${groupId} de outro dono`);
      throw new BadRequestException('Acesso negado');
    }

    if (group.status !== 'APPROVED') {
      throw new BadRequestException('Apenas grupos aprovados e ativos podem ser destacados/turbinados');
    }

    // Verificar se o usuário tem plano ativo (qualquer subscription APPROVED e isActive)
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'APPROVED',
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSubscription) {
      throw new BadRequestException('Plano ativo necessário');
    }

    // Verificar limite de grupos turbinados do plano
    const plan = activeSubscription.plan;
    const maxSponsoredGroups = plan.maxSponsoredGroups || 0;

    if (maxSponsoredGroups === 0) {
      throw new BadRequestException('Plano não permite turbinar grupos');
    }

    // Usar transação para evitar race condition
    const result = await this.prisma.$transaction(async (tx) => {
      // Contar quantos grupos do usuário já estão em destaque
      const userFeaturedCount = await tx.group.count({
        where: {
          createdById: userId,
          isFeatured: true,
        },
      });

      if (userFeaturedCount >= maxSponsoredGroups) {
        throw new BadRequestException('Limite de grupos turbinados atingido');
      }

      // Turbinar o grupo
      const updatedGroup = await tx.group.update({
        where: { id: groupId },
        data: { isFeatured: true },
        select: { id: true, name: true, isFeatured: true },
      });

      return { updatedGroup, userFeaturedCount };
    });

    this.logger.log(`Grupo turbinado: ${groupId}`);

    return {
      message: 'Grupo turbinado com sucesso',
      group: result.updatedGroup,
      remainingSlots: maxSponsoredGroups - result.userFeaturedCount - 1,
      planName: plan.name,
      maxSponsoredGroups,
    };
  }

  /**
   * Remove o destaque de um grupo
   */
  async unfeatureGroupManually(userId: string, groupId: string) {
    // Verificar se o grupo existe e pertence ao usuário (IDOR protection)
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, createdById: true },
    });

    if (!group) {
      throw new BadRequestException('Grupo não encontrado');
    }

    if (group.createdById !== userId) {
      this.logger.warn(`Acesso negado: usuário ${userId} tentou remover destaque de grupo ${groupId} de outro dono`);
      throw new BadRequestException('Acesso negado');
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: { isFeatured: false },
      select: { id: true, isFeatured: true },
    });

    this.logger.log(`Destaque removido: ${groupId}`);

    return {
      message: 'Destaque removido com sucesso',
      group: updatedGroup,
    };
  }

  /**
   * Para o scheduler (útil para testes ou shutdown)
   */
  stopScheduler() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.logger.log('⏹️  Scheduler de destaque parado');
    }
  }
}
