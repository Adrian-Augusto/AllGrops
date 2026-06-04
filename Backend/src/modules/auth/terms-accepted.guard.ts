import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TermsAcceptedGuard implements CanActivate {
  private readonly logger = new Logger(TermsAcceptedGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Optimize query - only select termsAccepted field
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { termsAccepted: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Usuário não encontrado');
    }

    // Check if user has accepted terms
    if (!dbUser.termsAccepted) {
      if (!this.isProduction) {
        this.logger.warn(`Terms not accepted for user: ${user.id}`);
      }
      throw new ForbiddenException(
        'Você deve aceitar os termos de uso antes de acessar este recurso. Acesse /termos/accept',
      );
    }

    return true;
  }
}
