/**
 * @fileoverview Logging utilities and middleware for MailPilot AI
 * @description Helper functions for structured logging, performance monitoring, and request tracing
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { performance } from "perf_hooks";
import { logger, logApiRequest, logPerformance } from "./logger";

/**
 * Request context for logging
 */
interface RequestContext {
  requestId: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  path: string;
  method: string;
  query?: Record<string, string>;
  startTime: number;
}

/**
 * Generate unique request ID for logging
 * @returns Unique request identifier
 */
export const generateLogRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract request context for logging
 * @param request - Next.js request object
 * @returns Request context object
 */
export const extractLogRequestContext = (
  request: NextRequest
): RequestContext => {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());

  return {
    requestId: generateLogRequestId(),
    userAgent: request.headers.get("user-agent") || undefined,
    ip:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined,
    path: url.pathname,
    method: request.method,
    query: Object.keys(query).length > 0 ? query : undefined,
    startTime: performance.now(),
  };
};

/**
 * Create a performance timer
 * @param name - Timer name
 * @returns Timer object with stop function
 */
export const createTimer = (name: string) => {
  const startTime = performance.now();

  return {
    stop: (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      logPerformance(name, Math.round(duration * 100) / 100, metadata);
      return duration;
    },
  };
};

/**
 * Async performance measurement decorator
 * @param name - Operation name
 * @param fn - Async function to measure
 * @param metadata - Additional metadata
 * @returns Promise with the function result
 */
export const measureAsync = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const timer = createTimer(name);
  try {
    const result = await fn();
    timer.stop({ success: true, ...metadata });
    return result;
  } catch (error) {
    timer.stop({ success: false, error: String(error), ...metadata });
    throw error;
  }
};

/**
 * Synchronous performance measurement
 * @param name - Operation name
 * @param fn - Function to measure
 * @param metadata - Additional metadata
 * @returns Function result
 */
export const measureSync = <T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T => {
  const timer = createTimer(name);
  try {
    const result = fn();
    timer.stop({ success: true, ...metadata });
    return result;
  } catch (error) {
    timer.stop({ success: false, error: String(error), ...metadata });
    throw error;
  }
};

/**
 * API request logging middleware
 * @param handler - API route handler
 * @returns Wrapped handler with logging
 */
export const withRequestLogging = (
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) => {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const requestContext = extractLogRequestContext(request);

    // Create child logger with request context
    const requestLogger = logger.child({
      requestId: requestContext.requestId,
      method: requestContext.method,
      path: requestContext.path,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    // Log incoming request
    requestLogger.info("Incoming request", {
      query: requestContext.query,
      type: "request_start",
    });

    try {
      // Add request context to the request object
      (request as any).context = requestContext;
      (request as any).logger = requestLogger;

      // Execute handler
      const response = await handler(request, context);

      // Calculate duration
      const duration =
        Math.round((performance.now() - requestContext.startTime) * 100) / 100;

      // Log API request
      logApiRequest(
        requestContext.method,
        requestContext.path,
        response.status,
        duration,
        {
          requestId: requestContext.requestId,
          userAgent: requestContext.userAgent,
          ip: requestContext.ip,
          query: requestContext.query,
        }
      );

      return response;
    } catch (error) {
      const duration =
        Math.round((performance.now() - requestContext.startTime) * 100) / 100;

      // Log failed request
      requestLogger.error("Request failed", {
        error: String(error),
        duration,
        unit: "ms",
        type: "request_error",
      });

      throw error;
    }
  };
};

/**
 * Sanitize sensitive data from objects for logging
 * @param data - Data object to sanitize
 * @param sensitiveFields - Array of field names to sanitize
 * @returns Sanitized data object
 */
export const sanitizeLogData = (
  data: Record<string, any>,
  sensitiveFields: string[] = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "cookie",
    "session",
    "credit_card",
    "ssn",
    "phone",
  ]
): Record<string, any> => {
  const sanitized = { ...data };

  const sanitizeValue = (obj: any, path: string[] = []): any => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
        sanitizeValue(item, [...path, String(index)])
      );
    }

    if (typeof obj === "object") {
      const result: Record<string, any> = {};

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const fieldName = currentPath.join(".").toLowerCase();

        // Check if this field should be sanitized
        const shouldSanitize = sensitiveFields.some((field) =>
          fieldName.includes(field.toLowerCase())
        );

        if (shouldSanitize && typeof value === "string") {
          result[key] = "[REDACTED]";
        } else {
          result[key] = sanitizeValue(value, currentPath);
        }
      }

      return result;
    }

    return obj;
  };

  return sanitizeValue(sanitized);
};

/**
 * Create structured log entry for database operations
 * @param operation - Database operation type
 * @param table - Table name
 * @param data - Operation data (will be sanitized)
 * @param metadata - Additional metadata
 * @returns Structured log entry
 */
export const createDatabaseLogEntry = (
  operation: string,
  table: string,
  data?: Record<string, any>,
  metadata?: Record<string, any>
) => {
  return {
    operation,
    table,
    data: data ? sanitizeLogData(data) : undefined,
    type: "database_operation",
    ...metadata,
  };
};

/**
 * Create structured log entry for external API calls
 * @param service - Service name
 * @param endpoint - API endpoint
 * @param method - HTTP method
 * @param requestData - Request data (will be sanitized)
 * @param responseData - Response data (will be sanitized)
 * @param metadata - Additional metadata
 * @returns Structured log entry
 */
export const createExternalApiLogEntry = (
  service: string,
  endpoint: string,
  method: string,
  requestData?: Record<string, any>,
  responseData?: Record<string, any>,
  metadata?: Record<string, any>
) => {
  return {
    service,
    endpoint,
    method,
    requestData: requestData ? sanitizeLogData(requestData) : undefined,
    responseData: responseData ? sanitizeLogData(responseData) : undefined,
    type: "external_api_call",
    ...metadata,
  };
};

/**
 * Log structured error with context
 * @param error - Error object or message
 * @param context - Error context
 * @param metadata - Additional metadata
 */
export const logStructuredError = (
  error: Error | string,
  context?: string,
  metadata?: Record<string, any>
) => {
  const errorData = {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : { message: error },
    context,
    type: "structured_error",
    ...sanitizeLogData(metadata || {}),
  };

  logger.error("Structured error occurred", errorData);
};

/**
 * Create audit log entry
 * @param userId - User ID who performed the action
 * @param action - Action performed
 * @param resource - Resource affected
 * @param metadata - Additional metadata
 */
export const createAuditLogEntry = (
  userId: string,
  action: string,
  resource?: string,
  metadata?: Record<string, any>
) => {
  logger.info("Audit log entry", {
    userId,
    action,
    resource,
    timestamp: new Date().toISOString(),
    type: "audit_log",
    ...sanitizeLogData(metadata || {}),
  });
};

/**
 * Memory usage logging utility
 */
export const logMemoryUsage = (label?: string): void => {
  const memUsage = process.memoryUsage();

  logger.debug("Memory usage", {
    label,
    heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
    external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
    rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
    unit: "MB",
    type: "memory_usage",
  });
};

/**
 * Process event handlers for graceful logging
 */
export const setupProcessLogging = (): void => {
  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM signal, shutting down gracefully");
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT signal, shutting down gracefully");
  });

  process.on("warning", (warning) => {
    logger.warn("Process warning", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
      type: "process_warning",
    });
  });
};
