import { Injectable, Logger } from '@nestjs/common';
import mercadopago from 'mercadopago';
import { SubscriptionsService } from '../subscriptions/subscription.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private subscriptionsService: SubscriptionsService) {
    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '',
    });
  }

  async createPreference({ userId, communityId, planId, planName, price }: {
    userId: string;
    communityId: string;
    planId: string;
    planName: string;
    price: number;
  }) {
    await this.subscriptionsService.createSubscription(userId, communityId, planId);

    const preference = {
      items: [
        {
          title: `Destaque de comunidade ${planName}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price,
        },
      ],
      payer: {
        email: `${userId}@example.com`,
      },
      notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL,
      external_reference: `${userId}:${communityId}:${planId}`,
      payment_methods: {
        excluded_payment_types: [{ id: 'atm' }],
      },
    };

    const response = await mercadopago.preferences.create(preference);
    return response.body;
  }

  async handleWebhook(body: any) {
    this.logger.log('Webhook recebido do Mercado Pago');
    const topic = body.type || body['type'];
    if (topic === 'payment') {
      const paymentId = body.data?.id || body['data']?.id;
      const payment = await mercadopago.payment.findById(paymentId);
      const externalReference = payment.body.external_reference as string;
      const status = payment.body.status === 'approved' ? 'APPROVED' : 'REJECTED';
      await this.subscriptionsService.updatePaymentStatus(externalReference, paymentId, status);
      return { success: true, status };
    }
    return { success: false, message: 'Evento não suportado' };
  }
}
