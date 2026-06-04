import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Verificar se usuário está autenticado
    if (!user) {
      this.logger.error('❌ AdminGuard: User not found in request.user');
      throw new ForbiddenException('Usuário não autenticado');
    }

    // 2. Verificar se role existe
    if (!user.role) {
      this.logger.error('❌ AdminGuard: Role field not found');
      throw new ForbiddenException('Role não encontrado no token. Faça login novamente.');
    }

    // 3. Verificar role (case-insensitive para segurança)
    const isAdmin = user.role.toUpperCase() === 'ADMIN';

    if (!isAdmin) {
      // Log sem expor informações sensíveis em produção
      if (!isProduction) {
        this.logger.warn('AdminGuard: Access denied for non-admin user', {
          user_id: user.id,
          user_role: user.role,
        });
      } else {
        this.logger.warn('AdminGuard: Access denied for non-admin user');
      }
      throw new ForbiddenException('Você não tem permissão de administrador');
    }

    // 4. Log de sucesso (sem expor user ID em produção)
    if (!isProduction) {
      this.logger.log('✅ AdminGuard: Admin access granted', {
        user_id: user.id,
        user_role: user.role,
      });
    } else {
      this.logger.debug('Admin access granted');
    }

    return true;
  }
}
