/**
 * @fileoverview Error handling system exports for MailPilot AI
 * @description Centralized exports for error codes, classes, and handlers
 * @author MailPilot AI Team
 * @version 1.0.0
 */

// Error codes and configuration
export {
  ERROR_CODES,
  HTTP_STATUS,
  ErrorCategory,
  getErrorConfig,
  isRetryableError,
  getErrorsByCategory,
  type ErrorCodeKey,
  type ErrorCodeConfig,
} from "./error-codes";

// Error classes
export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  BusinessLogicError,
  SystemError,
} from "./error-classes";

// Error handling utilities
export {
  generateRequestId,
  extractRequestContext,
  normalizeError,
  logError,
  createErrorResponse,
  withErrorHandler,
  assert,
  isRetryableError as isErrorRetryable,
  getRetryDelay,
  setupGlobalErrorHandlers,
} from "./error-handler";
