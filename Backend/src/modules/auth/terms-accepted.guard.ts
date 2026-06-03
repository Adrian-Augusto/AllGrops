import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TermsAcceptedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Get user from database - only select termsAccepted field for optimization
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { termsAccepted: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Usuário não encontrado');
    }

    // Check if user has accepted terms
    if (!dbUser.termsAccepted) {
      throw new ForbiddenException(
        'Você deve aceitar os termos de uso antes de acessar este recurso. Acesse /termos/accept',
      );
    }

    return true;
  }
}
