import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(ownerId: string, data: { name: string; description: string; categoryId: string }) {
    return this.prisma.group.create({
      data: {
        ...data,
        ownerId,
      },
    });
  }

  async getAll(categoryId?: string) {
    const where = categoryId ? { categoryId } : undefined;
    return this.prisma.group.findMany({
      where,
      include: {
        owner: true,
        category: true,
        memberships: true,
      },
    });
  }

  async getOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        owner: true,
        category: true,
        memberships: { include: { user: true } },
        posts: true,
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async joinGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
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

  async highlightGroup(ownerId: string, groupId: string, approved: boolean) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.ownerId !== ownerId) {
      throw new ForbiddenException('Only owner can manage this group');
    }
    return this.prisma.group.update({
      where: { id: groupId },
      data: { isFeatured: approved },
    });
  }
}
