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
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    prisma;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleExpiredSubscriptions() {
        this.logger.log('Checking for expired subscriptions...');
        const now = new Date();
        try {
            // Find all active subscriptions that have expired
            const expiredSubscriptions = await this.prisma.subscription.findMany({
                where: {
                    isActive: true,
                    status: 'APPROVED',
                    expiresAt: {
                        lt: now,
                    },
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    plan: true,
                    group: { select: { id: true, name: true } },
                },
            });
            if (expiredSubscriptions.length === 0) {
                this.logger.log('No expired subscriptions found.');
                return;
            }
            this.logger.log(`Found ${expiredSubscriptions.length} expired subscriptions. Cancelling...`);
            // Cancel each expired subscription
            for (const subscription of expiredSubscriptions) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        isActive: false,
                        status: 'REJECTED',
                        expiresAt: now,
                    },
                });
                this.logger.log(`Cancelled subscription ${subscription.id} for user ${subscription.user.email} (group: ${subscription.group?.name || 'N/A'})`);
            }
            this.logger.log(`Successfully cancelled ${expiredSubscriptions.length} expired subscriptions.`);
        }
        catch (error) {
            this.logger.error('Error cancelling expired subscriptions:', error);
        }
    }
    async handleExpiredSubscriptionsHourly() {
        this.logger.log('Hourly check for expired subscriptions...');
        const now = new Date();
        try {
            // Find all active subscriptions that have expired
            const expiredSubscriptions = await this.prisma.subscription.findMany({
                where: {
                    isActive: true,
                    status: 'APPROVED',
                    expiresAt: {
                        lt: now,
                    },
                },
            });
            if (expiredSubscriptions.length === 0) {
                this.logger.log('No expired subscriptions found in hourly check.');
                return;
            }
            this.logger.log(`Found ${expiredSubscriptions.length} expired subscriptions in hourly check. Cancelling...`);
            // Cancel each expired subscription
            for (const subscription of expiredSubscriptions) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        isActive: false,
                        status: 'REJECTED',
                        expiresAt: now,
                    },
                });
            }
            this.logger.log(`Successfully cancelled ${expiredSubscriptions.length} expired subscriptions in hourly check.`);
        }
        catch (error) {
            this.logger.error('Error cancelling expired subscriptions in hourly check:', error);
        }
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "handleExpiredSubscriptions", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "handleExpiredSubscriptionsHourly", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulerService);
