/**
 * @fileoverview API middleware utilities for MailPilot AI
 * @description Common middleware functions for API routes
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "../logging";
import { measureAsync } from "../logging/log-utilities";
import { checkDatabaseHealth } from "../database";
import { error } from "./api-responses";

/**
 * Middleware function type
 */
export type ApiMiddleware = (
  request: NextRequest,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

/**
 * Compose multiple middleware functions
 * @param middlewares - Array of middleware functions
 * @returns Composed middleware function
 */
export const composeMiddleware = (
  ...middlewares: ApiMiddleware[]
): ApiMiddleware => {
  return async (request: NextRequest, next: () => Promise<NextResponse>) => {
    const executeMiddleware = async (index: number): Promise<NextResponse> => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index];
      return middleware(request, () => executeMiddleware(index + 1));
    };

    return executeMiddleware(0);
  };
};

/**
 * CORS middleware
 * @param options - CORS options
 * @returns CORS middleware function
 */
export const corsMiddleware = (
  options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}
): ApiMiddleware => {
  const {
    origins = ["*"],
    methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    headers = ["Content-Type", "Authorization", "X-Requested-With"],
    credentials = false,
    maxAge = 86400, // 24 hours
  } = options;

  return async (request, next) => {
    const origin = request.headers.get("origin");
    const response = await next();

    // Set CORS headers
    if (origins.includes("*") || (origin && origins.includes(origin))) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
    }

    response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
    response.headers.set("Access-Control-Allow-Headers", headers.join(", "));
    response.headers.set("Access-Control-Max-Age", maxAge.toString());

    if (credentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  };
};

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
export const requestIdMiddleware: ApiMiddleware = async (request, next) => {
  const requestId = crypto.randomUUID();

  // Add request ID to the request object for access in handlers
  (request as any).requestId = requestId;

  const response = await next();

  // Add request ID to response headers
  response.headers.set("X-Request-ID", requestId);

  return response;
};

/**
 * Request timing middleware
 * Measures and logs request duration
 */
export const requestTimingMiddleware: ApiMiddleware = async (request, next) => {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    // Log request completion
    logger.info("API request completed", {
      method,
      path,
      status: response.status,
      duration,
      requestId: (request as any).requestId,
    });

    // Add timing header
    response.headers.set("X-Response-Time", `${duration}ms`);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("API request failed", {
      method,
      path,
      duration,
      error: error instanceof Error ? error.message : error,
      requestId: (request as any).requestId,
    });

    throw error;
  }
};

/**
 * Health check middleware
 * Checks system health before processing requests
 */
export const healthCheckMiddleware: ApiMiddleware = async (request, next) => {
  // Skip health check for the health endpoint itself
  const url = new URL(request.url);
  if (url.pathname === "/api/health") {
    return next();
  }

  try {
    // Quick database health check
    const dbHealthy = await checkDatabaseHealth();

    if (!dbHealthy) {
      logger.warn("Database health check failed during request", {
        path: url.pathname,
        method: request.method,
        requestId: (request as any).requestId,
      });

      return error.serviceUnavailable(
        "Service temporarily unavailable",
        30, // Retry after 30 seconds
        (request as any).requestId
      );
    }

    return next();
  } catch (healthError) {
    logger.error("Health check middleware error", {
      error: healthError instanceof Error ? healthError.message : healthError,
      requestId: (request as any).requestId,
    });

    return error.serviceUnavailable(
      "Service health check failed",
      60, // Retry after 1 minute
      (request as any).requestId
    );
  }
};

/**
 * Rate limiting middleware
 * @param config - Rate limiting configuration
 * @returns Rate limiting middleware function
 */
export const rateLimitingMiddleware = (config: {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: NextRequest) => string;
  skipUrls?: string[];
}): ApiMiddleware => {
  const { maxRequests, windowMs, keyGenerator, skipUrls = [] } = config;
  const requests = new Map<string, { count: number; resetTime: number }>();

  const defaultKeyGenerator = (request: NextRequest): string => {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    return ip;
  };

  return async (request, next) => {
    const url = new URL(request.url);

    // Skip rate limiting for certain URLs
    if (skipUrls.some((skipUrl) => url.pathname.startsWith(skipUrl))) {
      return next();
    }

    const key = (keyGenerator || defaultKeyGenerator)(request);
    const now = Date.now();
    const resetTime = now + windowMs;

    // Get current request count
    const current = requests.get(key);

    if (!current || current.resetTime <= now) {
      // First request or window expired
      requests.set(key, { count: 1, resetTime });
    } else if (current.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);

      logger.warn("Rate limit exceeded", {
        key,
        requests: current.count,
        maxRequests,
        windowMs,
        retryAfter,
        requestId: (request as any).requestId,
      });

      return error.rateLimited(
        `Too many requests. Try again in ${retryAfter} seconds.`,
        retryAfter,
        (request as any).requestId
      );
    } else {
      // Increment request count
      current.count += 1;
      requests.set(key, current);
    }

    const response = await next();

    // Add rate limit headers
    const requestInfo = requests.get(key);
    if (requestInfo) {
      response.headers.set("X-RateLimit-Limit", maxRequests.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - requestInfo.count).toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        requestInfo.resetTime.toString()
      );
    }

    return response;
  };
};

/**
 * Request size limiting middleware
 * @param maxSize - Maximum request size in bytes
 * @returns Size limiting middleware function
 */
export const requestSizeLimitMiddleware = (maxSize: number): ApiMiddleware => {
  return async (request, next) => {
    const contentLength = request.headers.get("content-length");

    if (contentLength) {
      const size = parseInt(contentLength, 10);

      if (size > maxSize) {
        logger.warn("Request size exceeded", {
          size,
          maxSize,
          requestId: (request as any).requestId,
        });

        return error.badRequest(
          `Request body too large. Maximum size is ${maxSize} bytes.`,
          { maxSize, actualSize: size },
          (request as any).requestId
        );
      }
    }

    return next();
  };
};

/**
 * Content type validation middleware
 * @param allowedTypes - Array of allowed content types
 * @returns Content type validation middleware function
 */
export const contentTypeMiddleware = (
  allowedTypes: string[]
): ApiMiddleware => {
  return async (request, next) => {
    // Skip validation for GET and DELETE requests
    if (
      request.method === "GET" ||
      request.method === "DELETE" ||
      request.method === "OPTIONS"
    ) {
      return next();
    }

    const contentType = request.headers.get("content-type");

    if (
      !contentType ||
      !allowedTypes.some((type) => contentType.includes(type))
    ) {
      return error.badRequest(
        "Invalid content type",
        {
          received: contentType,
          allowed: allowedTypes,
        },
        (request as any).requestId
      );
    }

    return next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware: ApiMiddleware = async (
  request,
  next
) => {
  const response = await next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Content Security Policy for API responses
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none';"
  );

  // Remove potentially sensitive headers
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  return response;
};

/**
 * API versioning middleware
 * @param supportedVersions - Array of supported API versions
 * @param defaultVersion - Default version to use
 * @returns Versioning middleware function
 */
export const versioningMiddleware = (
  supportedVersions: string[],
  defaultVersion: string
): ApiMiddleware => {
  return async (request, next) => {
    const version =
      request.headers.get("api-version") ||
      request.headers.get("x-api-version") ||
      defaultVersion;

    if (!supportedVersions.includes(version)) {
      return error.badRequest(
        "Unsupported API version",
        {
          requested: version,
          supported: supportedVersions,
        },
        (request as any).requestId
      );
    }

    // Add version to request for handlers to use
    (request as any).apiVersion = version;

    const response = await next();
    response.headers.set("API-Version", version);

    return response;
  };
};

/**
 * Request logging middleware
 */
export const requestLoggingMiddleware: ApiMiddleware = async (
  request,
  next
) => {
  const url = new URL(request.url);
  const startTime = Date.now();

  logger.info("API request started", {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    userAgent: request.headers.get("user-agent"),
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip"),
    requestId: (request as any).requestId,
  });

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    logger.info("API request completed", {
      method: request.method,
      path: url.pathname,
      status: response.status,
      duration,
      requestId: (request as any).requestId,
    });

    return response;
  } catch (requestError) {
    const duration = Date.now() - startTime;

    logger.error("API request error", {
      method: request.method,
      path: url.pathname,
      duration,
      error:
        requestError instanceof Error ? requestError.message : requestError,
      requestId: (request as any).requestId,
    });

    throw requestError;
  }
};

/**
 * Cache middleware
 * @param options - Cache options
 * @returns Cache middleware function
 */
export const cacheMiddleware = (options: {
  maxAge?: number;
  staleWhileRevalidate?: number;
  tags?: string[];
  varyBy?: string[];
}): ApiMiddleware => {
  const {
    maxAge = 60,
    staleWhileRevalidate = 300,
    tags = [],
    varyBy = [],
  } = options;

  return async (request, next) => {
    // Only cache GET requests
    if (request.method !== "GET") {
      return next();
    }

    const response = await next();

    // Only cache successful responses
    if (response.status === 200) {
      const cacheControl = [];

      if (maxAge > 0) {
        cacheControl.push(`max-age=${maxAge}`);
      }

      if (staleWhileRevalidate > 0) {
        cacheControl.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      }

      if (cacheControl.length > 0) {
        response.headers.set("Cache-Control", cacheControl.join(", "));
      }

      if (tags.length > 0) {
        response.headers.set("Cache-Tags", tags.join(", "));
      }

      if (varyBy.length > 0) {
        response.headers.set("Vary", varyBy.join(", "));
      }

      // Add ETag for better caching
      const etag = `"${Date.now()}"`;
      response.headers.set("ETag", etag);

      // Check if client has cached version
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: response.headers,
        });
      }
    }

    return response;
  };
};

/**
 * Common middleware stack for API routes
 */
export const commonApiMiddleware = composeMiddleware(
  requestIdMiddleware,
  corsMiddleware(),
  securityHeadersMiddleware,
  requestTimingMiddleware,
  requestLoggingMiddleware,
  healthCheckMiddleware
);

/**
 * Apply middleware to an API handler
 * @param handler - API handler function
 * @param middleware - Middleware to apply
 * @returns Wrapped handler function
 */
export const withMiddleware = (
  handler: (request: NextRequest) => Promise<NextResponse>,
  middleware: ApiMiddleware
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    return middleware(request, () => handler(request));
  };
};

/**
 * Apply multiple middleware to an API handler
 * @param handler - API handler function
 * @param middlewares - Array of middleware to apply
 * @returns Wrapped handler function
 */
export const withMiddlewares = (
  handler: (request: NextRequest) => Promise<NextResponse>,
  ...middlewares: ApiMiddleware[]
) => {
  const composedMiddleware = composeMiddleware(...middlewares);
  return withMiddleware(handler, composedMiddleware);
};
