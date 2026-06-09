import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(private prisma: PrismaService) {}

  async createPayment(data: {
    subscriptionId: string;
    idempotencyKey: string;
    externalReference: string;
  }) {
    try {
      // Check if payment already exists for this subscription (idempotency)
      const existingPayment = await this.prisma.payment.findUnique({
        where: { subscriptionId: data.subscriptionId },
      });

      if (existingPayment) {
        this.logger.log(`Payment already exists for subscription: ${data.subscriptionId}`);
        return existingPayment;
      }

      const payment = await this.prisma.payment.create({
        data: {
          subscriptionId: data.subscriptionId,
          idempotencyKey: data.idempotencyKey,
          externalReference: data.externalReference,
          status: PaymentStatus.PENDING,
        },
      });
      return payment;
    } catch (error: any) {
      // Handle unique constraint violation for subscriptionId
      if (error.code === 'P2002' && error.meta?.target?.includes('subscriptionId')) {
        this.logger.warn(`Payment already exists for subscription: ${data.subscriptionId}`);
        // Return existing payment
        return await this.prisma.payment.findUnique({
          where: { subscriptionId: data.subscriptionId },
        });
      }
      throw error;
    }
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { subscription: true },
    });
  }

  async updatePaymentStatus(paymentId: string, mercadoPagoId: string, status: PaymentStatus) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        mercadoPagoId,
        status,
        webhookProcessed: true,
        updatedAt: new Date(),
      },
    });
  }

  async findByMercadoPagoId(mercadoPagoId: string) {
    return this.prisma.payment.findUnique({
      where: { mercadoPagoId },
    });
  }

  async findByExternalReference(externalReference: string) {
    return this.prisma.payment.findFirst({
      where: { externalReference },
      include: { subscription: true },
    });
  }

  async hasProcessedWebhook(paymentId: string, webhookId: string): Promise<boolean> {
    const payment = await this.prisma.payment.findUnique({
      where: { mercadoPagoId: paymentId },
    });
    return payment?.lastWebhookId === webhookId;
  }

  async recordWebhookProcessing(paymentId: string, webhookId: string) {
    return this.prisma.payment.update({
      where: { mercadoPagoId: paymentId },
      data: {
        lastWebhookId: webhookId,
        updatedAt: new Date(),
      },
    });
  }

  // Generate idempotency key for new premium plan subscriptions
  generateIdempotencyKey(userId: string, planId: string): string {
    return `${userId}:${planId}:${uuidv4()}`;
  }
}
