"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeLogPaymentInfo = safeLogPaymentInfo;
exports.validateMercadoPagoSignature = validateMercadoPagoSignature;
exports.formatPaymentResponse = formatPaymentResponse;
const crypto = __importStar(require("crypto"));
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('MercadoPagoUtils');
// Safely log payment data without exposing sensitive info
function safeLogPaymentInfo(paymentId, status, action) {
    logger.log(`Payment ${paymentId} - Status: ${status} - Action: ${action}`);
}
// Validate Mercado Pago webhook signature
function validateMercadoPagoSignature(xSignature, xRequestId, body, accessToken) {
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
    }
    catch (error) {
        logger.error('Error validating signature', error);
        return false;
    }
}
// Format payment data for safe response
function formatPaymentResponse(data) {
    return {
        init_point: data.init_point,
        preference_id: data.preference_id || data.id,
        // Never return access tokens, payment details, or sensitive data
    };
}
