import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has ADMIN role in any community (or you can check a global admin flag)
    const adminMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: 'ADMIN',
      },
    });

    if (!adminMembership) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
