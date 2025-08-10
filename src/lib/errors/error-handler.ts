/**
 * @fileoverview Global error handling utilities for MailPilot AI
 * @description Centralized error processing, logging, and API response handling
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError, SystemError } from "./error-classes";
import { ERROR_CODES, HTTP_STATUS } from "./error-codes";

// Import logger dynamically to avoid circular dependency
let logger: any;
try {
  const loggerModule = require("../logging/logger");
  logger = loggerModule.logger;
} catch {
  // Fallback logger for development
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
  };
}

/**
 * Standard API error response format
 */
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    retryable?: boolean;
  };
}

/**
 * Request context for error handling
 */
interface ErrorContext {
  requestId?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  path?: string;
  method?: string;
  body?: any;
  query?: any;
  headers?: Record<string, string>;
  component?: string; // Allow component for system errors
}

/**
 * Generate a unique request ID for tracing
 * @returns Unique request identifier
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Extract context information from a request
 * @param request - The Next.js request object
 * @returns Extracted context information
 */
export const extractRequestContext = (request?: NextRequest): ErrorContext => {
  if (!request) return {};

  return {
    userAgent: request.headers.get("user-agent") || undefined,
    ip:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined,
    path: request.nextUrl?.pathname,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  };
};

/**
 * Convert various error types to AppError instances
 * @param error - The error to convert
 * @param context - Request context
 * @returns Standardized AppError instance
 */
export const normalizeError = (
  error: unknown,
  context?: ErrorContext
): AppError => {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    const validationErrors = error.issues.map((issue: any) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return new ValidationError("VALIDATION_INVALID_INPUT", {
      message: "Input validation failed",
      validationErrors,
      context: {
        ...context,
        zodIssues: error.issues,
      },
      requestId: context?.requestId,
      userId: context?.userId,
    });
  }

  // Standard JavaScript Error
  if (error instanceof Error) {
    return new SystemError("SYS_INTERNAL_ERROR", {
      message: error.message,
      cause: error,
      context,
      requestId: context?.requestId,
      userId: context?.userId,
    });
  }

  // Unknown error type
  return new SystemError("SYS_INTERNAL_ERROR", {
    message: "An unexpected error occurred",
    context: {
      ...context,
      originalError: String(error),
    },
    requestId: context?.requestId,
    userId: context?.userId,
  });
};

/**
 * Log error with appropriate level and context
 * @param error - The error to log
 * @param context - Additional context for logging
 */
export const logError = (
  error: AppError,
  context?: Record<string, any>
): void => {
  const logData = {
    ...error.toJSON(),
    ...context,
  };

  // Determine log level based on error type
  switch (error.statusCode) {
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
    case HTTP_STATUS.BAD_GATEWAY:
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
    case HTTP_STATUS.GATEWAY_TIMEOUT:
      logger.error("Application error occurred", logData);
      break;
    case HTTP_STATUS.UNAUTHORIZED:
    case HTTP_STATUS.FORBIDDEN:
      logger.warn("Authorization error occurred", logData);
      break;
    case HTTP_STATUS.BAD_REQUEST:
    case HTTP_STATUS.NOT_FOUND:
    case HTTP_STATUS.CONFLICT:
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      logger.info("Client error occurred", logData);
      break;
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      logger.warn("Rate limit error occurred", logData);
      break;
    default:
      logger.error("Unclassified error occurred", logData);
  }
};

/**
 * Create standardized error response for APIs
 * @param error - The error to respond with
 * @returns Next.js Response object
 */
export const createErrorResponse = (error: AppError): NextResponse => {
  // Log the error
  logError(error);

  // Create client-safe response
  const errorResponse: ApiErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
      requestId: error.requestId,
      retryable: error.isRetryable,
      // Only include details for client errors (4xx) and development
      ...(error.statusCode < 500 || process.env.NODE_ENV === "development"
        ? { details: error.context }
        : {}),
    },
  };

  return NextResponse.json(errorResponse, { status: error.statusCode });
};

/**
 * Global error handler for API routes
 * @param handler - The API route handler function
 * @returns Wrapped handler with error handling
 */
export const withErrorHandler = (
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) => {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const requestContext = extractRequestContext(request);
      const requestId = generateRequestId();

      const normalizedError = normalizeError(error, {
        ...requestContext,
        requestId,
      });

      return createErrorResponse(normalizedError);
    }
  };
};

/**
 * Assert condition and throw error if false
 * @param condition - Condition to check
 * @param error - Error to throw if condition is false
 */
export const assert = (
  condition: boolean,
  error: AppError
): asserts condition => {
  if (!condition) {
    throw error;
  }
};

/**
 * Type guard to check if error is retryable
 * @param error - Error to check
 * @returns True if error is retryable
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  return false;
};

/**
 * Get appropriate retry delay based on error type
 * @param error - The error that occurred
 * @param attemptNumber - Current retry attempt (starting from 1)
 * @returns Delay in milliseconds
 */
export const getRetryDelay = (
  error: AppError,
  attemptNumber: number
): number => {
  // Base delay in milliseconds
  const baseDelay = 1000;

  // Exponential backoff with jitter
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attemptNumber - 1),
    30000
  );
  const jitter = Math.random() * 0.1 * exponentialDelay;

  return Math.floor(exponentialDelay + jitter);
};

/**
 * Handle process-level unhandled errors
 */
export const setupGlobalErrorHandlers = (): void => {
  process.on("unhandledRejection", (reason: unknown, promise: Promise<any>) => {
    const error = normalizeError(reason, {
      component: "unhandledRejection",
    });

    logger.error("Unhandled promise rejection", {
      ...error.toJSON(),
      promise: String(promise),
    });

    // In production, you might want to exit the process
    if (process.env.NODE_ENV === "production") {
      logger.error("Exiting process due to unhandled rejection");
      process.exit(1);
    }
  });

  process.on("uncaughtException", (error: Error) => {
    const normalizedError = normalizeError(error, {
      component: "uncaughtException",
    });

    logger.error("Uncaught exception", normalizedError.toJSON());

    // Always exit on uncaught exceptions
    process.exit(1);
  });
};
