import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions...');
    
    const now = new Date();
    
    try {
      // Find all active subscriptions that have expired
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        select: {
          id: true,
          userId: true,
          groupId: true,
          planId: true,
          status: true,
          isActive: true,
          expiresAt: true,
          paymentId: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          plan: true,
          group: { select: { id: true, name: true } },
        },
        where: {
          isActive: true,
          status: 'APPROVED',
          expiresAt: {
            lt: now,
          },
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
            status: 'EXPIRED',
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

        this.logger.log(
          `Cancelled subscription ${subscription.id} for user ${subscription.user.email} (group: ${subscription.group?.name || 'N/A'})`,
        );
      }

      this.logger.log(`Successfully cancelled ${expiredSubscriptions.length} expired subscriptions.`);
    } catch (error) {
      this.logger.error('Error cancelling expired subscriptions:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredSubscriptionsHourly() {
    this.logger.log('Hourly check for expired subscriptions...');
    
    const now = new Date();
    
    try {
      // Find all active subscriptions that have expired
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        select: {
          id: true,
          groupId: true,
        },
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
            status: 'EXPIRED',
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
    } catch (error) {
      this.logger.error('Error cancelling expired subscriptions in hourly check:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredGroupsHourly() {
    this.logger.log('Hourly check for expired groups...');

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 30); // 30 dias atrás

    try {
      // Find all approved groups older than 30 days based on reviewedAt (fallback to createdAt)
      // Exclude groups with active premium/sponsored subscriptions
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
          NOT: {
            subscriptions: {
              some: {
                isActive: true,
                status: 'APPROVED',
                expiresAt: {
                  gt: new Date(),
                },
              },
            },
          },
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
          this.mailService.sendGroupExpiredEmail(
            group.createdBy.email,
            group.name
          ).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to send expiration email for group ${group.id}: ${msg}`);
          });
        }
      }

      this.logger.log(`Successfully expired ${expiredGroups.length} groups in hourly check.`);
    } catch (error: any) {
      this.logger.error('Error handling expired groups:', error);
    }
  }
}
