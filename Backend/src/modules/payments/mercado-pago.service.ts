import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private preferenceClient: any;
  private paymentClient: any;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
    
    if (!this.accessToken) {
      this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    // Initialize Mercado Pago SDK v3.1.0
    const config = new MercadoPagoConfig({ accessToken: this.accessToken });
    this.preferenceClient = new Preference(config);
    this.paymentClient = new Payment(config);
  }

  /**
   * Create a Mercado Pago Checkout Pro preference
   * @param params - Payment parameters
   * @returns Preference with init_point URL
   */
  async createPreference(params: {
    planName: string;
    planPrice: number;
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
    metadata: Record<string, string>;
    notificationUrl?: string;
  }): Promise<{ init_point: string; preference_id: string }> {
    try {
      const preference: any = {
        items: [
          {
            title: params.planName,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: params.planPrice,
          },
        ],
        payer: {
          email: this.configService.get<string>('MERCADO_PAGO_PAYER_EMAIL') || 'noreply@allgrops.com',
        },
        metadata: params.metadata,
        statement_descriptor: 'AllGrops - Destaque de Grupos',
        back_urls: {
          success: params.successUrl,
          failure: params.failureUrl,
          pending: params.pendingUrl,
        },
        payment_methods: {
          excluded_payment_types: [{ id: 'atm' }],
          installments: 1, // No installments for simplicity
        },
      };

      if (params.notificationUrl) {
        preference.notification_url = params.notificationUrl;
      }

      const response = await this.preferenceClient.create({ body: preference });

      this.logger.log(`Preference created: ${response.id}`);

      return {
        init_point: response.init_point,
        preference_id: response.id,
      };
    } catch (error: any) {
      this.logger.error(`Error creating preference: ${error.message}`);
      throw new BadRequestException('Failed to create payment preference');
    }
  }

  /**
   * Retrieve a preference by ID
   * @param preferenceId - Mercado Pago preference ID
   * @returns Preference details
   */
  async getPreference(preferenceId: string): Promise<any> {
    try {
      const preference = await this.preferenceClient.get({ id: preferenceId });
      return preference;
    } catch (error: any) {
      this.logger.error(`Error retrieving preference: ${error.message}`);
      throw new BadRequestException('Failed to retrieve preference');
    }
  }

  /**
   * Retrieve a payment by ID
   * @param paymentId - Mercado Pago payment ID
   * @returns Payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.paymentClient.get({ id: paymentId });
      return payment;
    } catch (error: any) {
      this.logger.error(`Error retrieving payment: ${error.message}`);
      throw new BadRequestException('Failed to retrieve payment');
    }
  }

  /**
   * Get Mercado Pago client instance (for advanced use cases)
   * @returns Mercado Pago clients
   */
  getClients() {
    return {
      preference: this.preferenceClient,
      payment: this.paymentClient,
    };
  }

  /**
   * Check if Mercado Pago is properly configured
   * @returns true if configured
   */
  isConfigured(): boolean {
    return !!this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
  }
}
