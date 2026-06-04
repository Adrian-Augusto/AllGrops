"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGuard = void 0;
const common_1 = require("@nestjs/common");
let AdminGuard = AdminGuard_1 = class AdminGuard {
    logger = new common_1.Logger(AdminGuard_1.name);
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const isProduction = process.env.NODE_ENV === 'production';
        // 1. Verificar se usuário está autenticado
        if (!user) {
            this.logger.error('❌ AdminGuard: User not found in request.user');
            throw new common_1.ForbiddenException('Usuário não autenticado');
        }
        // 2. Verificar se role existe
        if (!user.role) {
            this.logger.error('❌ AdminGuard: Role field not found');
            throw new common_1.ForbiddenException('Role não encontrado no token. Faça login novamente.');
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
            }
            else {
                this.logger.warn('AdminGuard: Access denied for non-admin user');
            }
            throw new common_1.ForbiddenException('Você não tem permissão de administrador');
        }
        // 4. Log de sucesso (sem expor user ID em produção)
        if (!isProduction) {
            this.logger.log('✅ AdminGuard: Admin access granted', {
                user_id: user.id,
                user_role: user.role,
            });
        }
        else {
            this.logger.debug('Admin access granted');
        }
        return true;
    }
};
exports.AdminGuard = AdminGuard;
exports.AdminGuard = AdminGuard = AdminGuard_1 = __decorate([
    (0, common_1.Injectable)()
], AdminGuard);
