import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Verificar se usuário está autenticado
    if (!user) {
      console.error('❌ AdminGuard: Usuário não encontrado em request.user');
      throw new ForbiddenException('Usuário não autenticado');
    }

    // 2. Verificar se role existe
    if (!user.role) {
      console.error('❌ AdminGuard: Campo "role" não encontrado', {
        user_id: user.id,
        user_keys: Object.keys(user),
      });
      throw new ForbiddenException('Role não encontrado no token. Faça login novamente.');
    }

    // 3. Verificar role (case-insensitive para segurança)
    const isAdmin = user.role.toUpperCase() === 'ADMIN';

    if (!isAdmin) {
      console.error('❌ AdminGuard: Acesso negado', {
        user_id: user.id,
        user_role: user.role,
        required_role: 'ADMIN',
      });
      throw new ForbiddenException('Você não tem permissão de administrador');
    }

    // 4. Log de sucesso
    console.log('✅ AdminGuard: Acesso concedido', {
      user_id: user.id,
      user_role: user.role,
    });

    return true;
  }
}
