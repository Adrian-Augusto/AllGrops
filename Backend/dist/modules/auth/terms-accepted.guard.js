"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TermsAcceptedGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TermsAcceptedGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let TermsAcceptedGuard = TermsAcceptedGuard_1 = class TermsAcceptedGuard {
    prisma;
    logger = new common_1.Logger(TermsAcceptedGuard_1.name);
    isProduction = process.env.NODE_ENV === 'production';
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.id) {
            throw new common_1.ForbiddenException('Usuário não autenticado');
        }
        // Optimize query - only select termsAccepted field
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { termsAccepted: true },
        });
        if (!dbUser) {
            throw new common_1.ForbiddenException('Usuário não encontrado');
        }
        // Check if user has accepted terms
        if (!dbUser.termsAccepted) {
            if (!this.isProduction) {
                this.logger.warn(`Terms not accepted for user: ${user.id}`);
            }
            throw new common_1.ForbiddenException('Você deve aceitar os termos de uso antes de acessar este recurso. Acesse /termos/accept');
        }
        return true;
    }
};
exports.TermsAcceptedGuard = TermsAcceptedGuard;
exports.TermsAcceptedGuard = TermsAcceptedGuard = TermsAcceptedGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TermsAcceptedGuard);
