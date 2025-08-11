/**
 * @fileoverview Winston logger configuration for MailPilot AI
 * @description Production-ready logging setup with environment-based configuration
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import winston from "winston";

/**
 * Environment-based configuration
 */
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
const isServerless = !!(
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

/**
 * Log levels for different environments
 */
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service: "mailpilot-ai",
      environment: process.env.NODE_ENV || "unknown",
      ...meta,
    };

    return JSON.stringify(logEntry, null, isDevelopment ? 2 : 0);
  })
);

/**
 * Development console format for better readability
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({
    format: "HH:mm:ss.SSS",
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return logMessage;
  })
);

/**
 * Configure transports based on environment
 */
const transports: winston.transport[] = [];

// Console transport
if (isDevelopment || isTest) {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
      level: logLevel,
    })
  );
} else {
  // Production console with structured logging
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: logLevel,
    })
  );
}

// File transports for production (but not in serverless environments)
if (isProduction && !isServerless) {
  // General application logs
  transports.push(
    new winston.transports.File({
      filename: "logs/app.log",
      format: logFormat,
      level: "info",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Error logs
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      format: logFormat,
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Combined logs
  transports.push(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true,
    })
  );
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: logLevel,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
  // Handle unhandled exceptions and rejections
  handleExceptions: !isTest,
  handleRejections: !isTest,
});

/**
 * Add exception and rejection handlers for production (but not in serverless environments)
 */
if (isProduction && !isServerless) {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: "logs/exceptions.log",
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: "logs/rejections.log",
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    })
  );
}

/**
 * Create a child logger with additional metadata
 * @param metadata - Additional metadata to include in logs
 * @returns Child logger instance
 */
export const createChildLogger = (metadata: Record<string, any>) => {
  return logger.child(metadata);
};

/**
 * Log performance metrics
 * @param name - Performance metric name
 * @param duration - Duration in milliseconds
 * @param metadata - Additional metadata
 */
export const logPerformance = (
  name: string,
  duration: number,
  metadata?: Record<string, any>
) => {
  logger.info("Performance metric", {
    metric: name,
    duration,
    unit: "ms",
    ...metadata,
  });
};

/**
 * Log API request information
 * @param method - HTTP method
 * @param url - Request URL
 * @param statusCode - Response status code
 * @param duration - Request duration in ms
 * @param metadata - Additional metadata
 */
export const logApiRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
) => {
  const level =
    statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

  logger.log(level, "API request", {
    method,
    url,
    statusCode,
    duration,
    unit: "ms",
    type: "api_request",
    ...metadata,
  });
};

/**
 * Log database query information
 * @param operation - Database operation (SELECT, INSERT, etc.)
 * @param table - Table name
 * @param duration - Query duration in ms
 * @param metadata - Additional metadata
 */
export const logDatabaseQuery = (
  operation: string,
  table: string,
  duration: number,
  metadata?: Record<string, any>
) => {
  logger.debug("Database query", {
    operation,
    table,
    duration,
    unit: "ms",
    type: "db_query",
    ...metadata,
  });
};

/**
 * Log external service calls
 * @param service - Service name (gmail, gemini, stripe, etc.)
 * @param operation - Operation performed
 * @param duration - Request duration in ms
 * @param metadata - Additional metadata
 */
export const logExternalService = (
  service: string,
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) => {
  logger.info("External service call", {
    service,
    operation,
    duration,
    unit: "ms",
    type: "external_service",
    ...metadata,
  });
};

/**
 * Log user activity
 * @param userId - User identifier
 * @param action - Action performed
 * @param metadata - Additional metadata
 */
export const logUserActivity = (
  userId: string,
  action: string,
  metadata?: Record<string, any>
) => {
  logger.info("User activity", {
    userId,
    action,
    type: "user_activity",
    ...metadata,
  });
};

/**
 * Log security events
 * @param event - Security event type
 * @param severity - Event severity (low, medium, high, critical)
 * @param metadata - Additional metadata
 */
export const logSecurityEvent = (
  event: string,
  severity: "low" | "medium" | "high" | "critical",
  metadata?: Record<string, any>
) => {
  const level =
    severity === "critical" ? "error" : severity === "high" ? "warn" : "info";

  logger.log(level, "Security event", {
    event,
    severity,
    type: "security",
    ...metadata,
  });
};

// Export the main logger instance
export { logger };

// Export default logger for convenience
export default logger;
