"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsModule = void 0;
const common_1 = require("@nestjs/common");
const subscription_service_1 = require("./subscription.service");
const subscription_limits_service_1 = require("./services/subscription-limits.service");
const subscription_controller_1 = require("./subscription.controller");
const prisma_service_1 = require("../../prisma/prisma.service");
let SubscriptionsModule = class SubscriptionsModule {
};
exports.SubscriptionsModule = SubscriptionsModule;
exports.SubscriptionsModule = SubscriptionsModule = __decorate([
    (0, common_1.Module)({
        controllers: [subscription_controller_1.SubscriptionsController],
        providers: [subscription_service_1.SubscriptionsService, subscription_limits_service_1.SubscriptionLimitsService, prisma_service_1.PrismaService],
        exports: [subscription_service_1.SubscriptionsService, subscription_limits_service_1.SubscriptionLimitsService],
    })
], SubscriptionsModule);
