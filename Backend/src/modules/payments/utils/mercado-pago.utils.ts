import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('MercadoPagoUtils');

// Safely log payment data without exposing sensitive info
export function safeLogPaymentInfo(paymentId: string | number, status: string, action: string): void {
  logger.log(`Payment ${paymentId} - Status: ${status} - Action: ${action}`);
}

// Validate Mercado Pago webhook signature
export function validateMercadoPagoSignature(
  xSignature: string | string[] | undefined,
  xRequestId: string | string[] | undefined,
  body: string,
  accessToken: string,
): boolean {
  if (!xSignature || !xRequestId) {
    logger.warn('Missing signature headers');
    return false;
  }

  const signatureHeader = Array.isArray(xSignature) ? xSignature[0] : xSignature;
  const requestIdHeader = Array.isArray(xRequestId) ? xRequestId[0] : xRequestId;

  try {
    // Mercado Pago uses: SHA256(request_id + access_token + request_body)
    const computedSignature = crypto
      .createHash('sha256')
      .update(`${requestIdHeader}${accessToken}${body}`)
      .digest('hex');

    // Extract the signature from the header (format: "ts=timestamp, v1=signature")
    const signatureParts = signatureHeader.split(',');
    let receivedSignature = '';

    for (const part of signatureParts) {
      const [key, value] = part.trim().split('=');
      if (key === 'v1') {
        receivedSignature = value;
        break;
      }
    }

    const isValid = computedSignature === receivedSignature;
    if (!isValid) {
      logger.warn('Invalid webhook signature');
    }
    return isValid;
  } catch (error) {
    logger.error('Error validating signature', error);
    return false;
  }
}

// Map Mercado Pago payment status to internal status
export function mapMercadoPagoStatus(status: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' {
  const statusMap: Record<string, 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'> = {
    approved: 'APPROVED',
    pending: 'PENDING',
    rejected: 'REJECTED',
    cancelled: 'CANCELLED',
    refunded: 'REFUNDED',
    in_process: 'PENDING',
    authorized: 'PENDING',
  };

  return statusMap[status] || 'PENDING';
}

// Extract payment method from Mercado Pago payment
export function extractPaymentMethod(payment: any): string {
  if (payment.payment_method_id) {
    const paymentMethods: Record<string, string> = {
      'pix': 'pix',
      'bolbradesco': 'boleto',
      'pec': 'pec',
      'visa': 'credit_card',
      'mastercard': 'credit_card',
      'amex': 'credit_card',
      'elo': 'credit_card',
      'hipercard': 'credit_card',
    };
    return paymentMethods[payment.payment_method_id] || payment.payment_method_id;
  }
  return 'unknown';
}

// Format payment data for safe response (never expose sensitive data)
export function formatPaymentResponse(data: {
  init_point?: string;
  id?: string;
  preference_id?: string;
}): Record<string, any> {
  return {
    init_point: data.init_point,
    preference_id: data.preference_id || data.id,
    // Never return access tokens, payment details, or sensitive data
  };
}

// Validate that payment is approved before granting access
export function isPaymentApproved(status: string): boolean {
  return status === 'APPROVED';
}

// Check if webhook event should be processed (idempotency)
export function shouldProcessEvent(lastWebhookId: string | null, currentWebhookId: string): boolean {
  if (!lastWebhookId) return true;
  return lastWebhookId !== currentWebhookId;
}
