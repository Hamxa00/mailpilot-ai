/**
 * @fileoverview Main library exports for MailPilot AI
 * @description Centralized exports for all utility libraries and systems
 * @author MailPilot AI Team
 * @version 1.0.0
 */

// Re-export existing utilities
export * from "./utils";

// Authentication system
export * from "./auth";

// Error handling system
export * from "./errors";

// Logging system - use explicit exports to avoid naming conflicts
export {
  logger,
  createChildLogger,
  logPerformance,
  logApiRequest,
  logDatabaseQuery,
  logExternalService,
  logUserActivity,
  logSecurityEvent,
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
} from "./logging";

// Security utilities
export * from "./security";

// Database utilities
export * from "./database";

// API utilities
export * from "./api";

// Configuration
export * from "./config";

// Validation system
export * from "./validation";

// Authentication system
export * from "./auth";

// Webhook system
export * from "./webhooks";
