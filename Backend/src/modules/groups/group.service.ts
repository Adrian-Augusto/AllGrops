import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { mergeGroupsByFeatureStatus, sortGroupsBySponsorship } from './utils/group-merging';
import { CategoryService } from './services/category.service';
import { SubscriptionLimitsService } from '../subscriptions/services/subscription-limits.service';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  private sponsoredCache: Map<string, { timestamp: number; groups: any[] }> = new Map();

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private categoryService: CategoryService,
    private subscriptionLimitsService: SubscriptionLimitsService,
  ) {}

  // USER ENDPOINTS

  async createGroup(userId: string, data: CreateGroupDto) {
    console.log('[GroupsService] createGroup called - userId:', userId, 'data:', data);

    if (!userId || !data.title) {
      throw new BadRequestException('Missing required fields: userId, title');
    }

    try {
      // Verificar se usuário pode patrocinar (informar no response)
      const sponsorshipInfo = await this.subscriptionLimitsService.canSponsorGroup(userId);

      // Buscar ou criar categoria automaticamente
      const category = await this.categoryService.findOrCreate(data.category);
      console.log('[GroupsService] Category found/created:', category);

      console.log('[GroupsService] Attempting to create group in database...');
      const group = await this.prisma.group.create({
        data: {
          name: data.title,
          description: data.description,
          link: data.link,
          platform: data.platform,
          photoUrl: data.photoUrl,
          categoryId: category?.id || null,
          createdById: userId,
          status: 'PENDING',
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          category: true,
        },
      });

      console.log('[GroupsService] Group created successfully:', group.id, group.name);

      return {
        ...group,
        sponsorshipInfo,
      };
    } catch (error) {
      console.error('[GroupsService] Error creating group:', error);
      this.logger.error('Erro ao criar grupo:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to create group: ${errorMessage}`);
    }
  }

  async findApproved(categoryId?: string, page = 1, limit = 10) {
    const baseWhere = {
      status: 'APPROVED' as const,
      ...(categoryId && { categoryId }),
    };

    const cacheKey = categoryId || 'all';
    const cached = this.sponsoredCache.get(cacheKey);
    const nowTime = Date.now();
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

    let sponsoredList: any[];

    if (cached && (nowTime - cached.timestamp < CACHE_TTL)) {
      sponsoredList = cached.groups;
    } else {
      const now = new Date();
      const sponsoredGroups = await this.prisma.group.findMany({
        where: {
          ...baseWhere,
          subscriptions: {
            some: {
              isActive: true,
              status: 'APPROVED',
              expiresAt: { gt: now }
            }
          }
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          category: true,
          memberships: true,
          subscriptions: {
            where: {
              isActive: true,
              status: 'APPROVED',
            },
            include: { plan: true },
          },
        },
        orderBy: { createdAt: 'desc' }
      });

      sponsoredList = this.shuffleArray(sponsoredGroups);
      this.sponsoredCache.set(cacheKey, {
        timestamp: nowTime,
        groups: sponsoredList
      });
    }

    // Buscar grupos gratuitos (não patrocinados)
    const now = new Date();
    const freeList = await this.prisma.group.findMany({
      where: {
        ...baseWhere,
        NOT: {
          subscriptions: {
            some: {
              isActive: true,
              status: 'APPROVED',
              expiresAt: { gt: now }
            }
          }
        }
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        category: true,
        memberships: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const { groups, total } = mergeGroupsByFeatureStatus(sponsoredList, freeList, limit, page);

    return {
      data: groups,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  private shuffleArray(array: any[]) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async findMyGroups(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.prisma.group.findMany({
      where: { createdById: userId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        category: true,
        memberships: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        category: true,
        memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        posts: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Se não é aprovado e o usuário não é o criador, não retorna
    if (group.status !== 'APPROVED' && group.createdById !== userId) {
      throw new NotFoundException('Você não tem permissão para visualizar este grupo');
    }

    return group;
  }

  async joinGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    if (group.status !== 'APPROVED') {
      throw new ForbiddenException('Você pode se juntar apenas a grupos aprovados');
    }

    return this.prisma.membership.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: {},
      create: {
        userId,
        groupId,
        role: 'MEMBER',
      },
    });
  }

  // ADMIN ENDPOINTS

  async findPending(page = 1, limit = 10) {
    console.log('[GroupsService] findPending called - page:', page, 'limit:', limit);
    const skip = (page - 1) * limit;
    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where: { status: 'PENDING' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          category: true,
          memberships: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.group.count({ where: { status: 'PENDING' } }),
    ]);
    console.log('[GroupsService] Found pending groups:', groups.length);
    return {
      data: groups,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findAll(status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = {};
    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus && ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].includes(normalizedStatus)) {
      where.status = normalizedStatus;
    }
    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
          category: true,
          memberships: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      data: groups,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async approveGroup(groupId: string, adminId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Enviar email de aprovação (não quebra a request se falhar)
    this.mailService.sendGroupStatusEmail(
      updatedGroup.createdBy.email,
      updatedGroup.name,
      'APPROVED',
    ).catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar email de aprovação: ${msg}`);
    });

    return updatedGroup;
  }

  async rejectGroup(groupId: string, adminId: string, reason: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    if (!reason) {
      throw new BadRequestException('Motivo da rejeição é obrigatório');
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Enviar email de rejeição (não quebra a request se falhar)
    this.mailService.sendGroupStatusEmail(
      updatedGroup.createdBy.email,
      updatedGroup.name,
      'REJECTED',
      reason,
    ).catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar email de rejeição: ${msg}`);
    });

    return updatedGroup;
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

  async getPublicStatistics() {
    const [approved, total] = await Promise.all([
      this.prisma.group.count({ where: { status: 'APPROVED' } }),
      this.prisma.group.count(),
    ]);

    return {
      approved,
      total,
    };
  }

  async deleteGroup(groupId: string, adminId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { createdBy: { select: { email: true, name: true } } },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Deletar relacionamentos primeiro
    await this.prisma.membership.deleteMany({
      where: { groupId },
    });

    await this.prisma.subscription.deleteMany({
      where: { groupId },
    });

    await this.prisma.post.deleteMany({
      where: { groupId },
    });

    // Deletar grupo
    const deletedGroup = await this.prisma.group.delete({
      where: { id: groupId },
    });

    // Enviar email notificando deletção
    this.mailService.sendGroupDeletedEmail(
      group.createdBy.email,
      group.name,
    ).catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar email de deleção: ${msg}`);
    });

    return {
      message: `Grupo "${group.name}" foi deletado com sucesso`,
      deletedGroup,
    };
  }

  async updateGroup(groupId: string, data: any) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Se status for alterado para APPROVED, resetar para PENDING para reavaliação
    if (data.status === 'APPROVED' && group.status !== 'APPROVED') {
      data.status = 'PENDING';
      data.reviewedById = null;
      data.reviewedAt = null;
    }

    // Map title to name if title is provided (DTO uses title, DB uses name)
    if (data.title !== undefined) {
      data.name = data.title;
      delete data.title;
    }

    // Handle category - if category string is provided, find or create it
    if (data.category !== undefined) {
      const category = await this.categoryService.findOrCreate(data.category);
      data.categoryId = category?.id || null;
      delete data.category;
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });

    return updatedGroup;
  }
}

