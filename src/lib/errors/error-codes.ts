/**
 * @fileoverview Error codes and HTTP status mappings for MailPilot AI
 * @description Centralized error code definitions with semantic meanings and proper HTTP status codes
 * @author MailPilot AI Team
 * @version 1.0.0
 */

/**
 * HTTP status codes mapping for consistent API responses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error categories for better organization and handling
 */
export enum ErrorCategory {
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  VALIDATION = "VALIDATION",
  DATABASE = "DATABASE",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  RATE_LIMIT = "RATE_LIMIT",
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  SYSTEM = "SYSTEM",
}

/**
 * Comprehensive error codes with semantic meanings and HTTP status mappings
 */
export const ERROR_CODES = {
  // Authentication Errors (AUTH_*)
  AUTH_REQUIRED: {
    code: "AUTH_REQUIRED",
    message: "Authentication required to access this resource",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_INVALID_TOKEN: {
    code: "AUTH_INVALID_TOKEN",
    message: "Invalid or expired authentication token",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_INVALID_CREDENTIALS: {
    code: "AUTH_INVALID_CREDENTIALS",
    message: "Invalid email or password",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_TOKEN_EXPIRED: {
    code: "AUTH_TOKEN_EXPIRED",
    message: "Authentication token has expired",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_SESSION_INVALID: {
    code: "AUTH_SESSION_INVALID",
    message: "Invalid or expired session",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },

  // Authorization Errors (AUTHZ_*)
  AUTHZ_INSUFFICIENT_PERMISSIONS: {
    code: "AUTHZ_INSUFFICIENT_PERMISSIONS",
    message: "Insufficient permissions to access this resource",
    status: HTTP_STATUS.FORBIDDEN,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },
  AUTHZ_ACCOUNT_ACCESS_DENIED: {
    code: "AUTHZ_ACCOUNT_ACCESS_DENIED",
    message: "Access denied to the requested email account",
    status: HTTP_STATUS.FORBIDDEN,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },
  AUTHZ_FEATURE_NOT_AVAILABLE: {
    code: "AUTHZ_FEATURE_NOT_AVAILABLE",
    message: "Feature not available for your current subscription plan",
    status: HTTP_STATUS.FORBIDDEN,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },

  // Validation Errors (VALIDATION_*)
  VALIDATION_INVALID_INPUT: {
    code: "VALIDATION_INVALID_INPUT",
    message: "Invalid input data provided",
    status: HTTP_STATUS.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },
  VALIDATION_MISSING_REQUIRED_FIELD: {
    code: "VALIDATION_MISSING_REQUIRED_FIELD",
    message: "Required field is missing",
    status: HTTP_STATUS.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },
  VALIDATION_INVALID_EMAIL_FORMAT: {
    code: "VALIDATION_INVALID_EMAIL_FORMAT",
    message: "Invalid email address format",
    status: HTTP_STATUS.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },
  VALIDATION_INVALID_DATE_FORMAT: {
    code: "VALIDATION_INVALID_DATE_FORMAT",
    message: "Invalid date format provided",
    status: HTTP_STATUS.BAD_REQUEST,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },

  // Database Errors (DB_*)
  DB_CONNECTION_FAILED: {
    code: "DB_CONNECTION_FAILED",
    message: "Database connection failed",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  DB_QUERY_FAILED: {
    code: "DB_QUERY_FAILED",
    message: "Database query execution failed",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  DB_TRANSACTION_FAILED: {
    code: "DB_TRANSACTION_FAILED",
    message: "Database transaction failed",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  DB_CONSTRAINT_VIOLATION: {
    code: "DB_CONSTRAINT_VIOLATION",
    message: "Database constraint violation",
    status: HTTP_STATUS.CONFLICT,
    category: ErrorCategory.DATABASE,
    retryable: false,
  },
  DB_RECORD_NOT_FOUND: {
    code: "DB_RECORD_NOT_FOUND",
    message: "Requested record not found",
    status: HTTP_STATUS.NOT_FOUND,
    category: ErrorCategory.DATABASE,
    retryable: false,
  },
  DB_DUPLICATE_RECORD: {
    code: "DB_DUPLICATE_RECORD",
    message: "Record already exists",
    status: HTTP_STATUS.CONFLICT,
    category: ErrorCategory.DATABASE,
    retryable: false,
  },

  // External Service Errors (EXT_*)
  EXT_GMAIL_API_ERROR: {
    code: "EXT_GMAIL_API_ERROR",
    message: "Gmail API service error",
    status: HTTP_STATUS.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  EXT_GEMINI_API_ERROR: {
    code: "EXT_GEMINI_API_ERROR",
    message: "Gemini AI API service error",
    status: HTTP_STATUS.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  EXT_STRIPE_API_ERROR: {
    code: "EXT_STRIPE_API_ERROR",
    message: "Stripe API service error",
    status: HTTP_STATUS.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  EXT_SUPABASE_ERROR: {
    code: "EXT_SUPABASE_ERROR",
    message: "Supabase service error",
    status: HTTP_STATUS.BAD_GATEWAY,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  EXT_SERVICE_UNAVAILABLE: {
    code: "EXT_SERVICE_UNAVAILABLE",
    message: "External service temporarily unavailable",
    status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  EXT_SERVICE_TIMEOUT: {
    code: "EXT_SERVICE_TIMEOUT",
    message: "External service request timeout",
    status: HTTP_STATUS.GATEWAY_TIMEOUT,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },

  // Rate Limiting Errors (RATE_*)
  RATE_LIMIT_EXCEEDED: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded. Please try again later",
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    category: ErrorCategory.RATE_LIMIT,
    retryable: true,
  },
  RATE_LIMIT_API_QUOTA_EXCEEDED: {
    code: "RATE_LIMIT_API_QUOTA_EXCEEDED",
    message: "API quota exceeded for your subscription plan",
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    category: ErrorCategory.RATE_LIMIT,
    retryable: false,
  },

  // Business Logic Errors (BL_*)
  BL_EMAIL_ALREADY_CONNECTED: {
    code: "BL_EMAIL_ALREADY_CONNECTED",
    message: "Email account is already connected",
    status: HTTP_STATUS.CONFLICT,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_INVALID_EMAIL_OPERATION: {
    code: "BL_INVALID_EMAIL_OPERATION",
    message: "Invalid email operation",
    status: HTTP_STATUS.BAD_REQUEST,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_SUBSCRIPTION_REQUIRED: {
    code: "BL_SUBSCRIPTION_REQUIRED",
    message: "Active subscription required for this feature",
    status: HTTP_STATUS.FORBIDDEN,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_USAGE_LIMIT_EXCEEDED: {
    code: "BL_USAGE_LIMIT_EXCEEDED",
    message: "Usage limit exceeded for your current plan",
    status: HTTP_STATUS.FORBIDDEN,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_INVALID_CREDENTIALS: {
    code: "BL_INVALID_CREDENTIALS",
    message: "Invalid email or password",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_EMAIL_NOT_VERIFIED: {
    code: "BL_EMAIL_NOT_VERIFIED",
    message: "Please verify your email before signing in",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_TOO_MANY_REQUESTS: {
    code: "BL_TOO_MANY_REQUESTS",
    message: "Too many requests. Please try again later",
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: true,
  },
  BL_LOGIN_FAILED: {
    code: "BL_LOGIN_FAILED",
    message: "Login failed",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_REGISTRATION_FAILED: {
    code: "BL_REGISTRATION_FAILED",
    message: "Registration failed",
    status: HTTP_STATUS.BAD_REQUEST,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },
  BL_UNAUTHORIZED: {
    code: "BL_UNAUTHORIZED",
    message: "Authentication required",
    status: HTTP_STATUS.UNAUTHORIZED,
    category: ErrorCategory.BUSINESS_LOGIC,
    retryable: false,
  },

  // System Errors (SYS_*)
  SYS_INTERNAL_ERROR: {
    code: "SYS_INTERNAL_ERROR",
    message: "Internal system error occurred",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    retryable: true,
  },
  SYS_CONFIGURATION_ERROR: {
    code: "SYS_CONFIGURATION_ERROR",
    message: "System configuration error",
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    category: ErrorCategory.SYSTEM,
    retryable: false,
  },
  SYS_MAINTENANCE_MODE: {
    code: "SYS_MAINTENANCE_MODE",
    message: "System is currently under maintenance",
    status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    category: ErrorCategory.SYSTEM,
    retryable: true,
  },
} as const;

/**
 * Type for error code keys
 */
export type ErrorCodeKey = keyof typeof ERROR_CODES;

/**
 * Type for error code configuration
 */
export type ErrorCodeConfig = (typeof ERROR_CODES)[ErrorCodeKey];

/**
 * Get error configuration by code
 * @param code - The error code key
 * @returns Error configuration object
 */
export const getErrorConfig = (code: ErrorCodeKey): ErrorCodeConfig => {
  return ERROR_CODES[code];
};

/**
 * Check if an error is retryable
 * @param code - The error code key
 * @returns True if the error is retryable
 */
export const isRetryableError = (code: ErrorCodeKey): boolean => {
  return ERROR_CODES[code].retryable;
};

/**
 * Get errors by category
 * @param category - The error category
 * @returns Array of error codes in the category
 */
export const getErrorsByCategory = (
  category: ErrorCategory
): ErrorCodeKey[] => {
  return Object.keys(ERROR_CODES).filter(
    (key) => ERROR_CODES[key as ErrorCodeKey].category === category
  ) as ErrorCodeKey[];
};
