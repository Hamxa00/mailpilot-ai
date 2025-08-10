/**
 * @fileoverview Logging system exports for MailPilot AI
 * @description Centralized exports for logger, utilities, and middleware
 * @author MailPilot AI Team
 * @version 1.0.0
 */

// Core logger
export {
  logger,
  createChildLogger,
  logPerformance,
  logApiRequest,
  logDatabaseQuery,
  logExternalService,
  logUserActivity,
  logSecurityEvent,
} from "./logger";

// Logging utilities
export {
  generateLogRequestId,
  extractLogRequestContext,
  createTimer,
  measureAsync,
  measureSync,
  withRequestLogging,
  sanitizeLogData,
  createDatabaseLogEntry,
  createExternalApiLogEntry,
  logStructuredError,
  createAuditLogEntry,
  logMemoryUsage,
  setupProcessLogging,
} from "./log-utilities";

// Re-export default logger for convenience
export { default } from "./logger";
