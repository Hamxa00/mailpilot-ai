/**
 * @fileoverview API response utilities for MailPilot AI
 * @description Standardized response formatting, status codes, and utilities
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextResponse } from "next/server";

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data?: T;

  /** Success status */
  success: boolean;

  /** Error information */
  error?: {
    message: string;
    code?: string;
    details?: any;
    field?: string;
  };

  /** Response metadata */
  meta?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
    message?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasMore: boolean;
    };
    performance?: {
      duration: number;
      queries: number;
    };
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

/**
 * HTTP status codes enum
 */
export enum HttpStatusCode {
  // Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // Redirection
  NOT_MODIFIED = 304,

  // Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  CONFLICT = 409,
  GONE = 410,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // Server Errors
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * Response builder class for creating standardized API responses
 */
export class ApiResponseBuilder<T = any> {
  private response: ApiResponse<T> = { success: true };

  /**
   * Set response data
   * @param data - Response data
   * @returns Builder instance
   */
  public data(data: T): ApiResponseBuilder<T> {
    this.response.data = data;
    this.response.success = true;
    return this;
  }

  /**
   * Set error information
   * @param message - Error message
   * @param code - Error code
   * @param details - Error details
   * @param field - Error field
   * @returns Builder instance
   */
  public error(
    message: string,
    code?: string,
    details?: any,
    field?: string
  ): ApiResponseBuilder<T> {
    this.response.success = false;
    this.response.error = {
      message,
      code,
      details,
      field,
    };
    delete this.response.data;
    return this;
  }

  /**
   * Set success data (alias for data method)
   * @param data - Success data
   * @returns Builder instance
   */
  public success(data: T): ApiResponseBuilder<T> {
    return this.data(data);
  }

  /**
   * Set HTTP status code
   * @param status - HTTP status code
   * @returns Builder instance
   */
  public status(status: HttpStatusCode): ApiResponseBuilder<T> {
    this._status = status;
    return this;
  }

  /**
   * Set success message
   * @param message - Success message
   * @returns Builder instance
   */
  public message(message: string): ApiResponseBuilder<T> {
    this._message = message;
    return this;
  }

  /**
   * Return JSON response
   * @returns NextResponse
   */
  public json(): NextResponse {
    const responseData = { ...this.response };
    if (this._message && responseData.success) {
      responseData.meta = { ...responseData.meta, message: this._message };
    }
    return NextResponse.json(responseData, {
      status: this._status || (responseData.success ? 200 : 400),
    });
  }

  private _status?: HttpStatusCode;
  private _message?: string;

  /**
   * Set request ID
   * @param requestId - Request ID
   * @returns Builder instance
   */
  public requestId(requestId: string): ApiResponseBuilder<T> {
    if (!this.response.meta) {
      this.response.meta = {};
    }
    this.response.meta.requestId = requestId;
    return this;
  }

  /**
   * Set timestamp
   * @param timestamp - ISO timestamp
   * @returns Builder instance
   */
  public timestamp(timestamp?: string): ApiResponseBuilder<T> {
    if (!this.response.meta) {
      this.response.meta = {};
    }
    this.response.meta.timestamp = timestamp || new Date().toISOString();
    return this;
  }

  /**
   * Set API version
   * @param version - API version
   * @returns Builder instance
   */
  public version(version: string): ApiResponseBuilder<T> {
    if (!this.response.meta) {
      this.response.meta = {};
    }
    this.response.meta.version = version;
    return this;
  }

  /**
   * Set pagination metadata
   * @param pagination - Pagination info
   * @returns Builder instance
   */
  public pagination(pagination: PaginationMeta): ApiResponseBuilder<T> {
    if (!this.response.meta) {
      this.response.meta = {};
    }
    this.response.meta.pagination = pagination;
    return this;
  }

  /**
   * Set performance metadata
   * @param duration - Request duration in ms
   * @param queries - Number of database queries
   * @returns Builder instance
   */
  public performance(
    duration: number,
    queries?: number
  ): ApiResponseBuilder<T> {
    if (!this.response.meta) {
      this.response.meta = {};
    }
    this.response.meta.performance = {
      duration,
      queries: queries || 0,
    };
    return this;
  }

  /**
   * Add custom metadata
   * @param key - Metadata key
   * @param value - Metadata value
   * @returns Builder instance
   */
  public meta(key: string, value: unknown): ApiResponseBuilder<T> {
    if (!this.response.meta) {
      this.response.meta = {};
    }
    (this.response.meta as any)[key] = value;
    return this;
  }

  /**
   * Build the final response
   * @param status - HTTP status code
   * @param headers - Additional headers
   * @returns NextResponse object
   */
  public build(
    status: HttpStatusCode = HttpStatusCode.OK,
    headers?: Record<string, string>
  ): NextResponse {
    // Always add timestamp if not set
    if (!this.response.meta?.timestamp) {
      this.timestamp();
    }

    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      ...headers,
    });

    // Add CORS headers
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    responseHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    return NextResponse.json(this.response, {
      status,
      headers: responseHeaders,
    });
  }
}

/**
 * Create a new response builder
 * @returns New response builder instance
 */
export const createResponse = <T = any>(): ApiResponseBuilder<T> => {
  return new ApiResponseBuilder<T>();
};

/**
 * Create API response - legacy alias for createResponse
 * @param options Response options
 * @returns NextResponse
 */
export const createApiResponse = (options: {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}): NextResponse => {
  const builder = createResponse();

  if (options.success && options.data) {
    builder.data(options.data);
  } else if (!options.success && options.error) {
    builder.error(options.error, options.message);
  }

  return builder.build();
};

/**
 * Success response helpers
 */
export const success = {
  /**
   * OK response (200)
   * @param data - Response data
   * @param requestId - Request ID
   * @returns NextResponse
   */
  ok: <T>(data: T, requestId?: string): NextResponse => {
    const builder = createResponse<T>().data(data);
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.OK);
  },

  /**
   * Created response (201)
   * @param data - Created resource data
   * @param requestId - Request ID
   * @returns NextResponse
   */
  created: <T>(data: T, requestId?: string): NextResponse => {
    const builder = createResponse<T>().data(data);
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.CREATED);
  },

  /**
   * Accepted response (202)
   * @param data - Response data
   * @param requestId - Request ID
   * @returns NextResponse
   */
  accepted: <T>(data: T, requestId?: string): NextResponse => {
    const builder = createResponse<T>().data(data);
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.ACCEPTED);
  },

  /**
   * No content response (204)
   * @param requestId - Request ID
   * @returns NextResponse
   */
  noContent: (requestId?: string): NextResponse => {
    const builder = createResponse();
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.NO_CONTENT);
  },

  /**
   * Paginated response (200)
   * @param data - Response data array
   * @param pagination - Pagination metadata
   * @param requestId - Request ID
   * @returns NextResponse
   */
  paginated: <T>(
    data: T[],
    pagination: PaginationMeta,
    requestId?: string
  ): NextResponse => {
    const builder = createResponse<T[]>().data(data).pagination(pagination);
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.OK);
  },
};

/**
 * Error response helpers
 */
export const error = {
  /**
   * Bad request response (400)
   * @param message - Error message
   * @param details - Error details
   * @param requestId - Request ID
   * @returns NextResponse
   */
  badRequest: (
    message: string,
    details?: any,
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "BAD_REQUEST", details);
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.BAD_REQUEST);
  },

  /**
   * Unauthorized response (401)
   * @param message - Error message
   * @param requestId - Request ID
   * @returns NextResponse
   */
  unauthorized: (
    message: string = "Authentication required",
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "UNAUTHORIZED");
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.UNAUTHORIZED);
  },

  /**
   * Forbidden response (403)
   * @param message - Error message
   * @param requestId - Request ID
   * @returns NextResponse
   */
  forbidden: (
    message: string = "Access denied",
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "FORBIDDEN");
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.FORBIDDEN);
  },

  /**
   * Not found response (404)
   * @param message - Error message
   * @param requestId - Request ID
   * @returns NextResponse
   */
  notFound: (
    message: string = "Resource not found",
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "NOT_FOUND");
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.NOT_FOUND);
  },

  /**
   * Method not allowed response (405)
   * @param allowedMethods - Allowed HTTP methods
   * @param requestId - Request ID
   * @returns NextResponse
   */
  methodNotAllowed: (
    allowedMethods: string[],
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(
      "Method not allowed",
      "METHOD_NOT_ALLOWED"
    );
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.METHOD_NOT_ALLOWED, {
      Allow: allowedMethods.join(", "),
    });
  },

  /**
   * Conflict response (409)
   * @param message - Error message
   * @param details - Error details
   * @param requestId - Request ID
   * @returns NextResponse
   */
  conflict: (
    message: string,
    details?: any,
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "CONFLICT", details);
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.CONFLICT);
  },

  /**
   * Validation error response (422)
   * @param message - Error message
   * @param validationErrors - Validation error details
   * @param requestId - Request ID
   * @returns NextResponse
   */
  validation: (
    message: string = "Validation failed",
    validationErrors?: unknown[],
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(
      message,
      "VALIDATION_ERROR",
      validationErrors
    );
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.UNPROCESSABLE_ENTITY);
  },

  /**
   * Rate limit exceeded response (429)
   * @param message - Error message
   * @param retryAfter - Retry after seconds
   * @param requestId - Request ID
   * @returns NextResponse
   */
  rateLimited: (
    message: string = "Too many requests",
    retryAfter?: number,
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "RATE_LIMITED");
    if (requestId) builder.requestId(requestId);
    const headers: Record<string, string> = {};
    if (retryAfter) {
      headers["Retry-After"] = retryAfter.toString();
    }
    return builder.build(HttpStatusCode.TOO_MANY_REQUESTS, headers);
  },

  /**
   * Internal server error response (500)
   * @param message - Error message
   * @param requestId - Request ID
   * @returns NextResponse
   */
  internal: (
    message: string = "Internal server error",
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "INTERNAL_ERROR");
    if (requestId) builder.requestId(requestId);
    return builder.build(HttpStatusCode.INTERNAL_SERVER_ERROR);
  },

  /**
   * Service unavailable response (503)
   * @param message - Error message
   * @param retryAfter - Retry after seconds
   * @param requestId - Request ID
   * @returns NextResponse
   */
  serviceUnavailable: (
    message: string = "Service temporarily unavailable",
    retryAfter?: number,
    requestId?: string
  ): NextResponse => {
    const builder = createResponse().error(message, "SERVICE_UNAVAILABLE");
    if (requestId) builder.requestId(requestId);
    const headers: Record<string, string> = {};
    if (retryAfter) {
      headers["Retry-After"] = retryAfter.toString();
    }
    return builder.build(HttpStatusCode.SERVICE_UNAVAILABLE, headers);
  },
};

/**
 * Calculate pagination metadata
 * @param page - Current page number (1-based)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 */
export const calculatePagination = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const pages = Math.ceil(total / limit);
  const hasMore = page < pages;

  return {
    page,
    limit,
    total,
    pages,
    hasMore,
  };
};

/**
 * Validate and normalize pagination parameters
 * @param page - Page parameter (string or number)
 * @param limit - Limit parameter (string or number)
 * @param maxLimit - Maximum allowed limit
 * @returns Normalized pagination parameters
 */
export const normalizePagination = (
  page?: string | number,
  limit?: string | number,
  maxLimit: number = 100
): { page: number; limit: number } => {
  let normalizedPage = 1;
  let normalizedLimit = 20;

  // Normalize page
  if (typeof page === "string") {
    const parsed = parseInt(page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      normalizedPage = parsed;
    }
  } else if (typeof page === "number" && page > 0) {
    normalizedPage = page;
  }

  // Normalize limit
  if (typeof limit === "string") {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      normalizedLimit = Math.min(parsed, maxLimit);
    }
  } else if (typeof limit === "number" && limit > 0) {
    normalizedLimit = Math.min(limit, maxLimit);
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
};

/**
 * Create streaming response for large datasets
 * @param stream - Readable stream
 * @param contentType - Content type
 * @param filename - Optional filename for downloads
 * @returns NextResponse with streaming body
 */
export const streamingResponse = (
  stream: ReadableStream,
  contentType: string = "application/json",
  filename?: string
): NextResponse => {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };

  if (filename) {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(stream, { headers });
};

/**
 * Create file download response
 * @param data - File data (buffer or string)
 * @param filename - Filename
 * @param contentType - Content type
 * @returns NextResponse for file download
 */
export const downloadResponse = (
  data: Buffer | string,
  filename: string,
  contentType: string = "application/octet-stream"
): NextResponse => {
  const headers = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": Buffer.isBuffer(data)
      ? data.length.toString()
      : Buffer.byteLength(data).toString(),
  };

  return new NextResponse(data, { headers });
};

/**
 * Create redirect response
 * @param url - Redirect URL
 * @param permanent - Whether redirect is permanent (301 vs 302)
 * @returns NextResponse redirect
 */
export const redirectResponse = (
  url: string,
  permanent: boolean = false
): NextResponse => {
  return NextResponse.redirect(url, permanent ? 301 : 302);
};
