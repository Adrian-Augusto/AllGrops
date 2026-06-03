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
exports.PlansController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const plans_service_1 = require("./plans.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const terms_accepted_guard_1 = require("../auth/terms-accepted.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const swagger_2 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SubscribePlanDto {
    planId;
    groupId;
}
__decorate([
    (0, swagger_2.ApiProperty)({
        example: 'monthly',
        description: 'ID do plano (UUID) ou slug (monthly, quarterly, annual)'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubscribePlanDto.prototype, "planId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({
        example: 'group-uuid-1234',
        description: 'ID do grupo para o qual assinar o plano'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubscribePlanDto.prototype, "groupId", void 0);
let PlansController = class PlansController {
    plansService;
    constructor(plansService) {
        this.plansService = plansService;
    }
    async getPlans() {
        return this.plansService.getPlans();
    }
    async getActivePlan(req) {
        const userId = req.user.id;
        return this.plansService.getActivePlan(userId);
    }
    async getUserPlans(user) {
        return this.plansService.getUserPlans(user.sub);
    }
    async subscribeToPlan(dto, user) {
        if (!dto.groupId) {
            throw new common_1.BadRequestException('Group ID is required');
        }
        return this.plansService.subscribeToPlan(user.sub, dto.groupId, dto.planId);
    }
    async cancelPlan(user) {
        return this.plansService.cancelUserSubscription(user.sub);
    }
};
exports.PlansController = PlansController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all available plans' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Plans retrieved successfully',
        schema: {
            example: {
                data: [
                    {
                        id: 'plan-uuid-monthly',
                        name: 'monthly',
                        price: 9.9,
                        duration: 30,
                        type: 'BASIC',
                        description: 'Destaque do grupo na categoria por 30 dias',
                        isActive: true,
                    },
                    {
                        id: 'plan-uuid-quarterly',
                        name: 'quarterly',
                        price: 24.9,
                        duration: 90,
                        type: 'BASIC',
                        description: 'Destaque do grupo na categoria por 90 dias',
                        isActive: true,
                    },
                    {
                        id: 'plan-uuid-annual',
                        name: 'annual',
                        price: 79.9,
                        duration: 365,
                        type: 'PREMIUM',
                        description: 'Destaque premium + featured do grupo por 1 ano',
                        isActive: true,
                    },
                ],
                total: 3,
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlansController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get current active subscription/plan' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Active subscription retrieved successfully',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlansController.prototype, "getActivePlan", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get user subscriptions and plans' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'User subscriptions retrieved successfully',
        schema: {
            example: {
                data: [
                    {
                        id: 'subscription-uuid-1',
                        userId: 'user-uuid',
                        groupId: 'group-uuid',
                        planId: 'plan-uuid',
                        status: 'APPROVED',
                        isActive: true,
                        paymentId: 'payment-id',
                        createdAt: '2026-06-01T10:30:00Z',
                        plan: {
                            id: 'plan-uuid',
                            name: 'monthly',
                            price: 9.9,
                            duration: 30,
                            type: 'BASIC',
                        },
                        group: {
                            id: 'group-uuid',
                            name: 'Meu Grupo',
                            photoUrl: 'https://...',
                            status: 'APPROVED',
                        },
                    },
                ],
                total: 1,
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlansController.prototype, "getUserPlans", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe to a plan' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Subscription created successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SubscribePlanDto, Object]),
    __metadata("design:returntype", Promise)
], PlansController.prototype, "subscribeToPlan", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, terms_accepted_guard_1.TermsAcceptedGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel user subscription' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Subscription cancelled successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlansController.prototype, "cancelPlan", null);
exports.PlansController = PlansController = __decorate([
    (0, swagger_1.ApiTags)('Plans'),
    (0, common_1.Controller)('plans'),
    __metadata("design:paramtypes", [plans_service_1.PlansService])
], PlansController);
