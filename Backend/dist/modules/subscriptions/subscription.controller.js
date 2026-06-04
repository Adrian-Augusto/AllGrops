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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const subscription_service_1 = require("./subscription.service");
const subscription_limits_service_1 = require("./services/subscription-limits.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const terms_accepted_guard_1 = require("../auth/terms-accepted.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    limitsService;
    constructor(subscriptionsService, limitsService) {
        this.subscriptionsService = subscriptionsService;
        this.limitsService = limitsService;
    }
    /**
     * Listar subscrições do usuário autenticado
     */
    async getMySubscriptions(user) {
        return this.subscriptionsService.getSubscriptions(user.id);
    }
    /**
     * Obter informações de limite de plano
     */
    async getMyLimits(user) {
        return this.limitsService.getUserSubscriptionInfo(user.id);
    }
    /**
     * Listar subscrições de um grupo (admin)
     */
    async getGroupSubscriptions(groupId) {
        return this.subscriptionsService.getGroupSubscriptions(groupId);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Minhas subscrições',
        description: 'Retorna todas as subscrições do usuário autenticado',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMySubscriptions", null);
__decorate([
    (0, common_1.Get)('limits'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Limites do meu plano',
        description: 'Retorna informações de limite baseado no plano do usuário',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMyLimits", null);
__decorate([
    (0, common_1.Get)('group/:groupId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Subscrições de um grupo',
        description: 'Retorna todas as subscrições de um grupo específico',
    }),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getGroupSubscriptions", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('Subscriptions'),
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionsService,
        subscription_limits_service_1.SubscriptionLimitsService])
], SubscriptionsController);
