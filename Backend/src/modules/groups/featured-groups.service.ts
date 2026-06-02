import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeaturedGroupsService implements OnModuleInit {
  private readonly logger = new Logger(FeaturedGroupsService.name);
  private rotationInterval: NodeJS.Timeout | undefined;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Iniciar scheduler de rotação automática (a cada 3 horas = 10800000ms)
    this.startAutomaticRotation();
  }

  /**
   * Inicia o scheduler automático que roda a cada 3 horas
   */
  private startAutomaticRotation() {
    const ROTATION_INTERVAL = 3 * 60 * 60 * 1000; // 3 horas em milissegundos

    this.logger.log('⏰ Iniciando scheduler de destaque (a cada 3 horas)');

    // Executar logo na inicialização
    this.rotateFeaturedGroups().catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro na rotação inicial: ${msg}`);
    });

    // Depois, repetir a cada 3 horas
    this.rotationInterval = setInterval(() => {
      this.logger.log('⏰ Executando rotação automática de destaque (a cada 3h)');
      this.rotateFeaturedGroups().catch((error) => {
        this.logger.error(`❌ Erro na rotação automática: ${error.message}`);
      });
    }, ROTATION_INTERVAL);
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

      // 1. Buscar todos os grupos com planos ativos (subscriptions APPROVED)
      const groupsWithActivePlans = await this.prisma.group.findMany({
        where: {
          subscriptions: {
            some: {
              status: 'APPROVED',
            },
          },
        },
        include: {
          subscriptions: {
            where: { status: 'APPROVED' },
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

      // 3. Ativar próximos em destaque (próximos 5 grupos)
      const newFeaturedCount = Math.min(5, groupsWithActivePlans.length);
      const newFeaturedIds = groupsWithActivePlans
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
   * Para o scheduler (útil para testes ou shutdown)
   */
  stopScheduler() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.logger.log('⏹️  Scheduler de destaque parado');
    }
  }
}
