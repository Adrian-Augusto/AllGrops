import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<string[]>();

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get(Roles, context.getHandler());

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!requiredRoles.includes(user.role)) {
      if (!this.isProduction) {
        this.logger.warn(`Access denied - required roles: [${requiredRoles.join(', ')}], user role: ${user.role}`);
      }
      throw new ForbiddenException(`Apenas usuários com role [${requiredRoles.join(', ')}] podem acessar`);
    }

    return true;
  }
}
