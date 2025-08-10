/**
 * @fileoverview Rate limiting utilities for MailPilot AI
 * @description Advanced rate limiting with Redis-like in-memory store and sliding window algorithm
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { RateLimitError } from "../errors";

/**
 * Rate limit configuration interface
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Unique identifier for the rate limit (e.g., IP, user ID) */
  identifier: string;
  /** Custom error message */
  message?: string;
  /** Skip rate limiting function */
  skip?: (identifier: string) => boolean;
  /** Custom key generator */
  keyGenerator?: (identifier: string) => string;
}

/**
 * Rate limit entry structure
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  requests: number[];
}

/**
 * Rate limit result
 */
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * In-memory rate limit store (use Redis in production)
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get rate limit entry for a key
   * @param key - Rate limit key
   * @returns Rate limit entry or null
   */
  get(key: string): RateLimitEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Set rate limit entry
   * @param key - Rate limit key
   * @param entry - Rate limit entry
   */
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  /**
   * Increment rate limit count
   * @param key - Rate limit key
   * @param windowMs - Time window in milliseconds
   * @param maxRequests - Maximum requests allowed
   * @returns Updated rate limit entry
   */
  increment(
    key: string,
    windowMs: number,
    maxRequests: number
  ): RateLimitEntry {
    const now = Date.now();
    const resetTime = now + windowMs;
    const existing = this.get(key);

    if (!existing) {
      const entry: RateLimitEntry = {
        count: 1,
        resetTime,
        requests: [now],
      };
      this.set(key, entry);
      return entry;
    }

    // Sliding window: remove old requests
    const windowStart = now - windowMs;
    existing.requests = existing.requests.filter((time) => time > windowStart);
    existing.requests.push(now);
    existing.count = existing.requests.length;

    // Update reset time if needed
    if (existing.requests.length > 0) {
      existing.resetTime = Math.max(
        existing.resetTime,
        existing.requests[0] + windowMs
      );
    }

    this.set(key, existing);
    return existing;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Delete a specific entry
   * @param key - Rate limit key to delete
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Destroy the store and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore();

/**
 * Default rate limit configurations
 */
export const RATE_LIMIT_PRESETS = {
  // General API endpoints
  API_GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Authentication endpoints
  AUTH_LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Password reset attempts
  PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Email sending
  EMAIL_SEND: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // AI API calls
  AI_REQUESTS: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Search queries
  SEARCH_QUERIES: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // File uploads
  FILE_UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Webhooks
  WEBHOOK: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;

/**
 * Check rate limit for a given configuration
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export const checkRateLimit = (config: RateLimitConfig): RateLimitResult => {
  // Skip rate limiting if skip function returns true
  if (config.skip?.(config.identifier)) {
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }

  // Generate rate limit key
  const key = config.keyGenerator
    ? config.keyGenerator(config.identifier)
    : `rate_limit:${config.identifier}`;

  // Increment and check
  const entry = rateLimitStore.increment(
    key,
    config.windowMs,
    config.maxRequests
  );
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetTime = new Date(entry.resetTime);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    resetTime,
    retryAfter: success
      ? undefined
      : Math.ceil((entry.resetTime - Date.now()) / 1000),
  };
};

/**
 * Rate limiting middleware for API routes
 * @param config - Rate limit configuration or preset key
 * @returns Middleware function
 */
export const withRateLimit = (
  config:
    | RateLimitConfig
    | keyof typeof RATE_LIMIT_PRESETS
    | Partial<RateLimitConfig>
) => {
  return async (
    request: Request,
    identifier?: string
  ): Promise<RateLimitResult> => {
    let rateLimitConfig: RateLimitConfig;

    // Handle different config types
    if (typeof config === "string") {
      const preset = RATE_LIMIT_PRESETS[config];
      rateLimitConfig = {
        ...preset,
        identifier: identifier || getClientIdentifier(request),
      };
    } else if ("maxRequests" in config && "windowMs" in config) {
      rateLimitConfig = config as RateLimitConfig;
    } else {
      // Partial config, use API_GENERAL as default
      rateLimitConfig = {
        ...RATE_LIMIT_PRESETS.API_GENERAL,
        identifier: identifier || getClientIdentifier(request),
        ...config,
      } as RateLimitConfig;
    }

    return checkRateLimit(rateLimitConfig);
  };
};

/**
 * Extract client identifier from request
 * @param request - HTTP request
 * @returns Client identifier (IP or user ID)
 */
export const getClientIdentifier = (request: Request): string => {
  // Try to get IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip =
    forwarded?.split(",")[0].trim() || realIp || cfConnectingIp || "unknown";

  return `ip:${ip}`;
};

/**
 * Create rate limit error when limit is exceeded
 * @param result - Rate limit result
 * @param message - Custom error message
 * @returns RateLimitError instance
 */
export const createRateLimitError = (
  result: RateLimitResult,
  message?: string
): RateLimitError => {
  return new RateLimitError("RATE_LIMIT_EXCEEDED", {
    limit: result.limit,
    resetTime: result.resetTime,
    retryAfter: result.retryAfter,
    message:
      message ||
      `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
  });
};

/**
 * Apply rate limiting to a function
 * @param config - Rate limit configuration
 * @param fn - Function to rate limit
 * @returns Rate limited function
 */
export const rateLimited = <T extends (...args: any[]) => any>(
  config: RateLimitConfig,
  fn: T
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = checkRateLimit(config);

    if (!result.success) {
      throw createRateLimitError(result);
    }

    return fn(...args);
  };
};

/**
 * Get rate limit status without incrementing
 * @param identifier - Client identifier
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export const getRateLimitStatus = (
  identifier: string,
  config: Omit<RateLimitConfig, "identifier">
): RateLimitResult => {
  const key = `rate_limit:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count < config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    resetTime: new Date(entry.resetTime),
    retryAfter: success
      ? undefined
      : Math.ceil((entry.resetTime - Date.now()) / 1000),
  };
};

/**
 * Clear rate limit for a specific identifier
 * @param identifier - Client identifier
 */
export const clearRateLimit = (identifier: string): void => {
  const key = `rate_limit:${identifier}`;
  rateLimitStore.delete(key);
};

/**
 * Get the rate limit store instance (for testing)
 */
export const getRateLimitStore = (): RateLimitStore => rateLimitStore;
