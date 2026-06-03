// Mercado Pago status mapping to internal status
export const PAYMENT_STATUS_MAP: Record<string, string> = {
  approved: 'APPROVED',
  pending: 'PENDING',
  rejected: 'REJECTED',
  cancelled: 'REJECTED',
  refunded: 'REJECTED',
  in_process: 'PENDING',
  authorized: 'PENDING',
};

// Payment statuses for internal use
export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// Safe fields to log (no sensitive data)
export const SAFE_LOG_FIELDS = [
  'id',
  'status',
  'type',
  'external_reference',
  'created_at',
] as const;

// Rate limiting constants
export const RATE_LIMITS = {
  PAYMENT_CREATE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour per user
  },
  WEBHOOK: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute globally
  },
} as const;
