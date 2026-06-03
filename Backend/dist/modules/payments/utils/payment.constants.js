"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = exports.SAFE_LOG_FIELDS = exports.PAYMENT_STATUSES = exports.PAYMENT_STATUS_MAP = void 0;
// Mercado Pago status mapping to internal status
exports.PAYMENT_STATUS_MAP = {
    approved: 'APPROVED',
    pending: 'PENDING',
    rejected: 'REJECTED',
    cancelled: 'REJECTED',
    refunded: 'REJECTED',
    in_process: 'PENDING',
    authorized: 'PENDING',
};
// Payment statuses for internal use
exports.PAYMENT_STATUSES = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};
// Safe fields to log (no sensitive data)
exports.SAFE_LOG_FIELDS = [
    'id',
    'status',
    'type',
    'external_reference',
    'created_at',
];
// Rate limiting constants
exports.RATE_LIMITS = {
    PAYMENT_CREATE: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 requests per hour per user
    },
    WEBHOOK: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per minute globally
    },
};
