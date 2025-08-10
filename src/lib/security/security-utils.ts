/**
 * @fileoverview Security utilities for MailPilot AI
 * @description Security logging and event tracking utilities
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { logger } from "../logging/logger";

/**
 * Security event severity levels
 */
export type SecurityEventSeverity = "low" | "medium" | "high" | "critical";

/**
 * Log a security event
 * @param eventType - Type of security event
 * @param severity - Event severity level
 * @param context - Additional context data
 */
export function logSecurityEvent(
  eventType: string,
  severity: SecurityEventSeverity,
  context?: Record<string, any>
): void {
  logger.warn(`Security Event: ${eventType}`, {
    eventType,
    severity,
    timestamp: new Date().toISOString(),
    ...context,
  });

  // In production, you might also want to:
  // - Send to security monitoring service
  // - Store in security audit log
  // - Trigger alerts for high/critical events
  if (severity === "high" || severity === "critical") {
    logger.error(`Critical Security Event: ${eventType}`, {
      eventType,
      severity,
      context,
    });
  }
}
