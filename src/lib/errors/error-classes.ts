/**
 * @fileoverview Custom error classes for MailPilot AI application
 * @description Structured error classes with proper inheritance and context handling
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { ErrorCodeKey, ErrorCodeConfig, getErrorConfig } from "./error-codes";

/**
 * Base application error class with enhanced context and tracing
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly category: string;
  public readonly isRetryable: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly context?: Record<string, any>;
  public readonly cause?: Error;

  /**
   * Creates a new AppError instance
   * @param errorCode - The error code from ERROR_CODES
   * @param options - Additional error options
   */
  constructor(
    errorCode: ErrorCodeKey,
    options?: {
      message?: string;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    const config = getErrorConfig(errorCode);
    const message = options?.message || config.message;

    super(message);

    this.name = this.constructor.name;
    this.code = config.code;
    this.statusCode = config.status;
    this.category = config.category;
    this.isRetryable = config.retryable;
    this.timestamp = new Date();
    this.requestId = options?.requestId;
    this.userId = options?.userId;
    this.context = options?.context;
    this.cause = options?.cause;

    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging and API responses
   * @returns Serialized error object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      category: this.category,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Get safe error object for client responses (excludes sensitive data)
   * @returns Safe error object for client
   */
  toClientSafe(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Authentication-related error
 */
export class AuthenticationError extends AppError {
  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      | "AUTH_REQUIRED"
      | "AUTH_INVALID_TOKEN"
      | "AUTH_INVALID_CREDENTIALS"
      | "AUTH_TOKEN_EXPIRED"
      | "AUTH_SESSION_INVALID"
    >,
    options?: {
      message?: string;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
  }
}

/**
 * Authorization-related error
 */
export class AuthorizationError extends AppError {
  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      | "AUTHZ_INSUFFICIENT_PERMISSIONS"
      | "AUTHZ_ACCOUNT_ACCESS_DENIED"
      | "AUTHZ_FEATURE_NOT_AVAILABLE"
    >,
    options?: {
      message?: string;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
  }
}

/**
 * Validation-related error
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;
  public readonly validationErrors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;

  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      | "VALIDATION_INVALID_INPUT"
      | "VALIDATION_MISSING_REQUIRED_FIELD"
      | "VALIDATION_INVALID_EMAIL_FORMAT"
      | "VALIDATION_INVALID_DATE_FORMAT"
    >,
    options?: {
      message?: string;
      field?: string;
      value?: any;
      validationErrors?: Array<{
        field: string;
        message: string;
        code: string;
      }>;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
    this.field = options?.field;
    this.value = options?.value;
    this.validationErrors = options?.validationErrors;
  }

  /**
   * Convert validation error to JSON with field information
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
      validationErrors: this.validationErrors,
    };
  }

  /**
   * Get safe validation error for client
   */
  toClientSafe(): Record<string, any> {
    return {
      ...super.toClientSafe(),
      field: this.field,
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Database-related error
 */
export class DatabaseError extends AppError {
  public readonly operation?: string;
  public readonly table?: string;
  public readonly query?: string;

  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      | "DB_CONNECTION_FAILED"
      | "DB_QUERY_FAILED"
      | "DB_TRANSACTION_FAILED"
      | "DB_CONSTRAINT_VIOLATION"
      | "DB_RECORD_NOT_FOUND"
      | "DB_DUPLICATE_RECORD"
    >,
    options?: {
      message?: string;
      operation?: string;
      table?: string;
      query?: string;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
    this.operation = options?.operation;
    this.table = options?.table;
    this.query = options?.query;
  }

  /**
   * Convert database error to JSON with operation details
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      table: this.table,
      query: this.query,
    };
  }
}

/**
 * External service-related error
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly endpoint?: string;
  public readonly responseStatus?: number;
  public readonly responseBody?: any;

  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      | "EXT_GMAIL_API_ERROR"
      | "EXT_GEMINI_API_ERROR"
      | "EXT_STRIPE_API_ERROR"
      | "EXT_SUPABASE_ERROR"
      | "EXT_SERVICE_UNAVAILABLE"
      | "EXT_SERVICE_TIMEOUT"
    >,
    options: {
      service: string;
      message?: string;
      endpoint?: string;
      responseStatus?: number;
      responseBody?: any;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
    this.service = options.service;
    this.endpoint = options.endpoint;
    this.responseStatus = options.responseStatus;
    this.responseBody = options.responseBody;
  }

  /**
   * Convert external service error to JSON with service details
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      service: this.service,
      endpoint: this.endpoint,
      responseStatus: this.responseStatus,
      responseBody: this.responseBody,
    };
  }

  /**
   * Get safe external service error for client (excludes sensitive response data)
   */
  toClientSafe(): Record<string, any> {
    return {
      ...super.toClientSafe(),
      service: this.service,
    };
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  public readonly limit: number;
  public readonly resetTime?: Date;
  public readonly retryAfter?: number;

  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      "RATE_LIMIT_EXCEEDED" | "RATE_LIMIT_API_QUOTA_EXCEEDED"
    >,
    options: {
      limit: number;
      message?: string;
      resetTime?: Date;
      retryAfter?: number;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
    this.limit = options.limit;
    this.resetTime = options.resetTime;
    this.retryAfter = options.retryAfter;
  }

  /**
   * Convert rate limit error to JSON with limit information
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      limit: this.limit,
      resetTime: this.resetTime?.toISOString(),
      retryAfter: this.retryAfter,
    };
  }

  /**
   * Get safe rate limit error for client with retry information
   */
  toClientSafe(): Record<string, any> {
    return {
      ...super.toClientSafe(),
      limit: this.limit,
      resetTime: this.resetTime?.toISOString(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Business logic error
 */
export class BusinessLogicError extends AppError {
  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      | "BL_EMAIL_ALREADY_CONNECTED"
      | "BL_INVALID_EMAIL_OPERATION"
      | "BL_SUBSCRIPTION_REQUIRED"
      | "BL_USAGE_LIMIT_EXCEEDED"
    >,
    options?: {
      message?: string;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
  }
}

/**
 * System error
 */
export class SystemError extends AppError {
  public readonly component?: string;

  constructor(
    errorCode: Extract<
      ErrorCodeKey,
      "SYS_INTERNAL_ERROR" | "SYS_CONFIGURATION_ERROR" | "SYS_MAINTENANCE_MODE"
    >,
    options?: {
      message?: string;
      component?: string;
      cause?: Error;
      context?: Record<string, any>;
      requestId?: string;
      userId?: string;
    }
  ) {
    super(errorCode, options);
    this.component = options?.component;
  }

  /**
   * Convert system error to JSON with component information
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      component: this.component,
    };
  }
}
