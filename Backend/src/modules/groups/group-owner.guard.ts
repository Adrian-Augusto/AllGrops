import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const groupId = request.params.id;

    // Check if user is authenticated
    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Get the group
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { createdById: true },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Check if user is the owner
    if (group.createdById !== user.id) {
      throw new ForbiddenException('Você não tem permissão para modificar este grupo');
    }

    return true;
  }
}
