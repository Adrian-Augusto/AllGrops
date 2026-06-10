"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const payment_controller_1 = require("./payment.controller");
const payment_service_1 = require("./payment.service");
const payment_repository_1 = require("./payment.repository");
const mercado_pago_service_1 = require("./mercado-pago.service");
const subscription_module_1 = require("../subscriptions/subscription.module");
const prisma_service_1 = require("../../prisma/prisma.service");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [subscription_module_1.SubscriptionsModule],
        controllers: [payment_controller_1.PaymentsController],
        providers: [payment_service_1.PaymentsService, payment_repository_1.PaymentRepository, mercado_pago_service_1.MercadoPagoService, prisma_service_1.PrismaService],
        exports: [payment_service_1.PaymentsService, payment_repository_1.PaymentRepository],
    })
], PaymentsModule);
