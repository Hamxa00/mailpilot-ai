/**
 * @fileoverview Security utilities exports for MailPilot AI
 * @description Centralized exports for rate limiting and encryption utilities
 * @author MailPilot AI Team
 * @version 1.0.0
 */

// Rate limiting utilities
export {
  checkRateLimit,
  withRateLimit,
  getClientIdentifier,
  createRateLimitError,
  rateLimited,
  getRateLimitStatus,
  clearRateLimit,
  getRateLimitStore,
  RATE_LIMIT_PRESETS,
} from "./rate-limiter";

// Encryption and crypto utilities
export {
  generateSecureToken,
  generateRandomHex,
  generateNumericCode,
  hashPassword,
  verifyPassword,
  createHmacSignature,
  verifyHmacSignature,
  hashData,
  createSessionToken,
  verifySessionToken,
  maskSensitiveData,
  generateApiKey,
  validateApiKeyFormat,
  generateTotpSecret,
  secureCompare,
  generateUuid,
  sanitizeInput,
  isSafeString,
} from "./crypto-utilities";

// Security utilities
export { logSecurityEvent } from "./security-utils";
