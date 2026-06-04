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
const mail_service_1 = require("../mail/mail.service");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    prisma;
    mailService;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
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
            // Cancel each expired subscription and remove featured status
            for (const subscription of expiredSubscriptions) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        isActive: false,
                        status: 'REJECTED',
                        expiresAt: now,
                    },
                });
                if (subscription.groupId) {
                    await this.prisma.group.update({
                        where: { id: subscription.groupId },
                        data: { isFeatured: false },
                    });
                    this.logger.log(`Removed feature status for group ${subscription.groupId} due to expired subscription ${subscription.id}`);
                }
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
            // Cancel each expired subscription and remove featured status
            for (const subscription of expiredSubscriptions) {
                await this.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        isActive: false,
                        status: 'REJECTED',
                        expiresAt: now,
                    },
                });
                if (subscription.groupId) {
                    await this.prisma.group.update({
                        where: { id: subscription.groupId },
                        data: { isFeatured: false },
                    });
                    this.logger.log(`Removed feature status for group ${subscription.groupId} due to expired subscription ${subscription.id}`);
                }
            }
            this.logger.log(`Successfully cancelled ${expiredSubscriptions.length} expired subscriptions in hourly check.`);
        }
        catch (error) {
            this.logger.error('Error cancelling expired subscriptions in hourly check:', error);
        }
    }
    async handleExpiredGroupsHourly() {
        this.logger.log('Hourly check for expired groups...');
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - 30); // 30 dias atrás
        try {
            // Find all approved groups older than 30 days based on reviewedAt (fallback to createdAt)
            const expiredGroups = await this.prisma.group.findMany({
                where: {
                    status: 'APPROVED',
                    OR: [
                        {
                            reviewedAt: {
                                lt: thresholdDate,
                            },
                        },
                        {
                            reviewedAt: null,
                            createdAt: {
                                lt: thresholdDate,
                            },
                        },
                    ],
                },
                include: {
                    createdBy: { select: { id: true, name: true, email: true } },
                },
            });
            if (expiredGroups.length === 0) {
                this.logger.log('No expired groups found in hourly check.');
                return;
            }
            this.logger.log(`Found ${expiredGroups.length} expired groups. Expiring...`);
            // Expire each group and notify owner
            for (const group of expiredGroups) {
                await this.prisma.group.update({
                    where: { id: group.id },
                    data: {
                        status: 'EXPIRED',
                    },
                });
                this.logger.log(`Group ${group.id} ("${group.name}") has expired.`);
                // Notify user via email
                if (group.createdBy?.email) {
                    // Trigger email notification in background
                    this.mailService.sendGroupExpiredEmail(group.createdBy.email, group.name).catch((err) => {
                        const msg = err instanceof Error ? err.message : String(err);
                        this.logger.error(`Failed to send expiration email for group ${group.id}: ${msg}`);
                    });
                }
            }
            this.logger.log(`Successfully expired ${expiredGroups.length} groups in hourly check.`);
        }
        catch (error) {
            this.logger.error('Error handling expired groups:', error);
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
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "handleExpiredGroupsHourly", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], SchedulerService);
