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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payment_service_1 = require("./payment.service");
const create_payment_dto_1 = require("./dto/create-payment.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiters
const createPaymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: 'Too many payment requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for non-POST requests
        return req.method !== 'POST';
    },
});
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many webhook requests',
    standardHeaders: true,
    legacyHeaders: false,
});
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    /**
     * Create payment preference in Mercado Pago
     * Returns only init_point URL for checkout
     */
    async createPayment(user, dto) {
        return this.paymentsService.createPreference({
            userId: user.id,
            planId: dto.planId,
            idempotencyKey: dto.idempotencyKey,
        });
    }
    /**
     * Mercado Pago Webhook Handler
     * Receives payment status notifications
     * Does not require authentication
     */
    async handleWebhook(body, xSignature, xRequestId) {
        // For production, validate webhook signature
        // This example assumes MP validation will be added when secret is available
        return this.paymentsService.handleWebhook(body, xSignature, xRequestId);
    }
    /**
     * List available payment plans
     * Public endpoint
     */
    async getPlans() {
        return this.paymentsService.getAvailablePlans();
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create payment',
        description: 'Creates a payment preference for group highlighting. Returns Mercado Pago checkout link.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Payment preference created',
        schema: {
            example: {
                init_point: 'https://www.mercadopago.com.br/checkout/v1/...',
                preference_id: 'payment-id',
                idempotency_key: 'key',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_payment_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Mercado Pago webhook',
        description: 'Receives payment status notifications from Mercado Pago',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Webhook processed',
        schema: { example: { success: true } },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-signature')),
    __param(2, (0, common_1.Headers)('x-request-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_dto_1.PaymentWebhookDto, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'List payment plans',
        description: 'Returns all available highlighting plans',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of plans',
        schema: {
            example: [
                {
                    id: 'plan-id',
                    name: 'Basic',
                    price: 29.99,
                    duration: 30,
                    description: 'Basic plan',
                },
            ],
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPlans", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentsService])
], PaymentsController);
