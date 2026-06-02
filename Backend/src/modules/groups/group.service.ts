import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private prisma: PrismaService, private mailService: MailService) {}

  // USER ENDPOINTS

  async createGroup(userId: string, data: CreateGroupDto) {
    if (!userId || !data.name) {
      throw new BadRequestException('Missing required fields: userId, name');
    }

    // Garantir que categoryId seja null se não fornecido ou vazio
    let validCategoryId: string | null = null;
    
    if (data.categoryId && data.categoryId.trim() !== '') {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new BadRequestException(`Category with id "${data.categoryId}" not found. Create a category first.`);
      }
      validCategoryId = data.categoryId;
    }

    try {
      return await this.prisma.group.create({
        data: {
          name: data.name,
          description: data.description,
          link: data.link,
          platform: data.platform,
          photoUrl: data.photoUrl,
          categoryId: validCategoryId,
          createdById: userId,
          status: 'PENDING',
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          category: true,
        },
      });
    } catch (error) {
      this.logger.error('Erro ao criar grupo:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to create group: ${errorMessage}`);
    }
  }

  async findApproved(categoryId?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.prisma.group.findMany({
      where: {
        status: 'APPROVED',
        ...(categoryId && { categoryId }),
      },
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
    const skip = (page - 1) * limit;
    return this.prisma.group.findMany({
      where: { status: 'PENDING' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        category: true,
        memberships: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAll(status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }
    return this.prisma.group.findMany({
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
    });
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

  async deleteGroup(groupId: string, adminId: string) {
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
}

