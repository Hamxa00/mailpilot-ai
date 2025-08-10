/**
 * @fileoverview Base API handler utilities for MailPilot AI
 * @description Base classes and utilities for building consistent API handlers
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, measureAsync, logUserActivity } from "../logging";
import {
  withRateLimit,
  createRateLimitError,
  RATE_LIMIT_PRESETS,
} from "../security";
import { withValidation, validateOrThrow } from "../validation";
import { withErrorHandler } from "../errors";
import { ExtendedUser } from "../auth";

/**
 * HTTP methods enum
 */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  OPTIONS = "OPTIONS",
  HEAD = "HEAD",
}

/**
 * API handler context
 */
export interface ApiHandlerContext {
  /** Request ID for tracing */
  requestId: string;

  /** User information */
  user?: ExtendedUser;

  /** Client information */
  client?: {
    ip: string;
    userAgent: string;
    country?: string;
  };

  /** Request timestamp */
  timestamp: Date;

  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * API handler options
 */
export interface ApiHandlerOptions {
  /** Required authentication */
  requireAuth?: boolean;

  /** Required user roles */
  requiredRoles?: string[];

  /** Rate limiting configuration */
  rateLimit?: {
    preset?: keyof typeof RATE_LIMIT_PRESETS;
    maxRequests?: number;
    windowMs?: number;
    keyGenerator?: (request: NextRequest) => string;
  };

  /** Request validation schemas */
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };

  /** CORS configuration */
  cors?: {
    origins?: string[];
    methods?: HttpMethod[];
    headers?: string[];
    credentials?: boolean;
  };

  /** Cache configuration */
  cache?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    tags?: string[];
  };

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Custom middleware */
  middleware?: Array<
    (request: NextRequest, context: ApiHandlerContext) => Promise<void>
  >;
}

/**
 * Validated request data
 */
export interface ValidatedRequestData {
  body?: any;
  query?: any;
  params?: any;
}

/**
 * API handler function type
 */
export type ApiHandlerFunction = (
  request: NextRequest,
  context: ApiHandlerContext,
  validated?: ValidatedRequestData
) => Promise<NextResponse>;

/**
 * Base API handler class
 */
export abstract class BaseApiHandler {
  protected abstract method: HttpMethod;
  protected abstract path: string;
  protected options: ApiHandlerOptions;

  constructor(options: ApiHandlerOptions = {}) {
    this.options = options;
  }

  /**
   * Handle the API request
   * @param request - Next.js request object
   * @returns Response
   */
  public async handle(request: NextRequest): Promise<NextResponse> {
    const context = await this.createContext(request);

    try {
      // Apply middleware
      if (this.options.middleware) {
        for (const middleware of this.options.middleware) {
          await middleware(request, context);
        }
      }

      // Check authentication
      if (this.options.requireAuth && !context.user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Check user roles
      if (this.options.requiredRoles && context.user) {
        const hasRole = this.options.requiredRoles.includes(
          context.user.role || "user"
        );
        if (!hasRole) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }

      // Apply rate limiting
      if (this.options.rateLimit) {
        const rateLimitKey =
          this.options.rateLimit.keyGenerator?.(request) ||
          context.client?.ip ||
          "unknown";

        const rateLimitResult = await withRateLimit(
          this.options.rateLimit.preset || "API_GENERAL"
        )(request, rateLimitKey);

        if (!rateLimitResult.success) {
          throw createRateLimitError(rateLimitResult);
        }
      }

      // Validate request
      let validatedData: ValidatedRequestData | undefined;
      if (this.options.validation) {
        validatedData = await this.validateRequest(request, context);
      }

      // Execute handler with timeout
      const result = await this.executeWithTimeout(
        () => this.execute(request, context, validatedData),
        this.options.timeout || 30000
      );

      return result;
    } catch (error) {
      logger.error("API handler error", {
        path: this.path,
        method: this.method,
        error: error instanceof Error ? error.message : error,
        requestId: context.requestId,
        userId: context.user?.id,
      });

      throw error;
    }
  }

  /**
   * Execute the handler logic
   * @param request - Next.js request object
   * @param context - Handler context
   * @param validated - Validated request data
   * @returns Response
   */
  protected abstract execute(
    request: NextRequest,
    context: ApiHandlerContext,
    validated?: ValidatedRequestData
  ): Promise<NextResponse>;

  /**
   * Create request context
   * @param request - Next.js request object
   * @returns Handler context
   */
  protected async createContext(
    request: NextRequest
  ): Promise<ApiHandlerContext> {
    const requestId = crypto.randomUUID();
    const timestamp = new Date();

    // Extract client information
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const country = request.headers.get("cf-ipcountry") || undefined;

    // Extract user information (would be set by auth middleware)
    const user = (request as any).user || undefined;

    return {
      requestId,
      timestamp,
      user,
      client: {
        ip,
        userAgent,
        country,
      },
    };
  }

  /**
   * Validate request data
   * @param request - Next.js request object
   * @param context - Handler context
   * @returns Validated data
   */
  protected async validateRequest(
    request: NextRequest,
    context: ApiHandlerContext
  ): Promise<ValidatedRequestData> {
    const validated: ValidatedRequestData = {};

    try {
      // Validate body
      if (this.options.validation?.body) {
        const body = await request.json().catch(() => null);
        validated.body = validateOrThrow(this.options.validation.body, body, {
          requestId: context.requestId,
          userId: context.user?.id,
        });
      }

      // Validate query parameters
      if (this.options.validation?.query) {
        const url = new URL(request.url);
        const query = Object.fromEntries(url.searchParams.entries());
        validated.query = validateOrThrow(
          this.options.validation.query,
          query,
          { requestId: context.requestId, userId: context.user?.id }
        );
      }

      // Validate route parameters
      if (this.options.validation?.params) {
        // Note: Route params would need to be extracted from the URL pattern
        // This is a placeholder for when Next.js provides param extraction
        validated.params = {};
      }

      return validated;
    } catch (error) {
      logger.error("Request validation failed", {
        path: this.path,
        method: this.method,
        error: error instanceof Error ? error.message : error,
        requestId: context.requestId,
      });
      throw error;
    }
  }

  /**
   * Execute function with timeout
   * @param fn - Function to execute
   * @param timeoutMs - Timeout in milliseconds
   * @returns Function result
   */
  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }
}

/**
 * Create a standardized API handler
 * @param method - HTTP method
 * @param handler - Handler function
 * @param options - Handler options
 * @returns Next.js API handler
 */
export const createApiHandler = (
  method: HttpMethod,
  handler: ApiHandlerFunction,
  options: ApiHandlerOptions = {}
) => {
  class CustomApiHandler extends BaseApiHandler {
    protected method = method;
    protected path = ""; // Would be set based on route

    protected async execute(
      request: NextRequest,
      context: ApiHandlerContext,
      validated?: ValidatedRequestData
    ): Promise<NextResponse> {
      return measureAsync(
        `api_${method.toLowerCase()}_handler`,
        () => handler(request, context, validated),
        {
          method,
          path: this.path,
          requestId: context.requestId,
          userId: context.user?.id,
        }
      );
    }
  }

  const handlerInstance = new CustomApiHandler(options);

  // Apply error handling middleware
  return withErrorHandler(async (request: NextRequest) => {
    // Check if method matches
    if (request.method !== method) {
      return NextResponse.json(
        { error: `Method ${request.method} not allowed` },
        {
          status: 405,
          headers: { Allow: method },
        }
      );
    }

    return handlerInstance.handle(request);
  });
};

/**
 * Create GET handler
 * @param handler - Handler function
 * @param options - Handler options
 * @returns API handler
 */
export const createGetHandler = (
  handler: ApiHandlerFunction,
  options: ApiHandlerOptions = {}
) => createApiHandler(HttpMethod.GET, handler, options);

/**
 * Create POST handler
 * @param handler - Handler function
 * @param options - Handler options
 * @returns API handler
 */
export const createPostHandler = (
  handler: ApiHandlerFunction,
  options: ApiHandlerOptions = {}
) => createApiHandler(HttpMethod.POST, handler, options);

/**
 * Create PUT handler
 * @param handler - Handler function
 * @param options - Handler options
 * @returns API handler
 */
export const createPutHandler = (
  handler: ApiHandlerFunction,
  options: ApiHandlerOptions = {}
) => createApiHandler(HttpMethod.PUT, handler, options);

/**
 * Create PATCH handler
 * @param handler - Handler function
 * @param options - Handler options
 * @returns API handler
 */
export const createPatchHandler = (
  handler: ApiHandlerFunction,
  options: ApiHandlerOptions = {}
) => createApiHandler(HttpMethod.PATCH, handler, options);

/**
 * Create DELETE handler
 * @param handler - Handler function
 * @param options - Handler options
 * @returns API handler
 */
export const createDeleteHandler = (
  handler: ApiHandlerFunction,
  options: ApiHandlerOptions = {}
) => createApiHandler(HttpMethod.DELETE, handler, options);

/**
 * CRUD handler options
 */
export interface CrudHandlerOptions
  extends Omit<ApiHandlerOptions, "validation"> {
  /** Entity name for logging */
  entityName: string;

  /** ID parameter name */
  idParam?: string;

  /** Validation schemas for each operation */
  validation?: {
    create?: z.ZodSchema;
    update?: z.ZodSchema;
    query?: z.ZodSchema;
  };

  /** Custom handlers */
  handlers?: {
    beforeCreate?: (data: any, context: ApiHandlerContext) => Promise<any>;
    afterCreate?: (entity: any, context: ApiHandlerContext) => Promise<void>;
    beforeUpdate?: (
      id: string,
      data: any,
      context: ApiHandlerContext
    ) => Promise<any>;
    afterUpdate?: (entity: any, context: ApiHandlerContext) => Promise<void>;
    beforeDelete?: (id: string, context: ApiHandlerContext) => Promise<void>;
    afterDelete?: (id: string, context: ApiHandlerContext) => Promise<void>;
  };
}

/**
 * CRUD operations interface
 */
export interface CrudOperations<T> {
  create(data: unknown): Promise<T>;
  findById(id: string): Promise<T | null>;
  find(options?: unknown): Promise<{ data: T[]; total: number }>;
  update(id: string, data: unknown): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Create CRUD handlers for an entity
 * @param operations - CRUD operations implementation
 * @param options - CRUD handler options
 * @returns Object with CRUD handlers
 */
export const createCrudHandlers = <T>(
  operations: CrudOperations<T>,
  options: CrudHandlerOptions
) => {
  const { entityName, handlers = {}, validation = {} } = options;

  return {
    // GET /entity - List entities
    list: createGetHandler(
      async (request, context, validated) => {
        const { query = {} } = validated || {};

        const result = await measureAsync(
          `${entityName}_list`,
          () => operations.find(query),
          { entityName, ...query }
        );

        logUserActivity(
          context.user?.id || "anonymous",
          `${entityName}_list_viewed`,
          { count: result.data.length }
        );

        return NextResponse.json({
          data: result.data,
          meta: {
            total: result.total,
            count: result.data.length,
            requestId: context.requestId,
          },
        });
      },
      {
        ...options,
        validation: validation.query ? { query: validation.query } : undefined,
      }
    ),

    // GET /entity/:id - Get entity by ID
    get: createGetHandler(async (request, context) => {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const id = pathParts[pathParts.length - 1];

      const entity = await measureAsync(
        `${entityName}_get`,
        () => operations.findById(id),
        { entityName, entityId: id }
      );

      if (!entity) {
        return NextResponse.json(
          { error: `${entityName} not found` },
          { status: 404 }
        );
      }

      logUserActivity(context.user?.id || "anonymous", `${entityName}_viewed`, {
        entityId: id,
      });

      return NextResponse.json({
        data: entity,
        meta: { requestId: context.requestId },
      });
    }, options),

    // POST /entity - Create entity
    create: createPostHandler(
      async (request, context, validated) => {
        let { body } = validated || {};

        // Apply before create hook
        if (handlers.beforeCreate) {
          body = await handlers.beforeCreate(body, context);
        }

        const entity = await measureAsync(
          `${entityName}_create`,
          () => operations.create(body),
          { entityName }
        );

        // Apply after create hook
        if (handlers.afterCreate) {
          await handlers.afterCreate(entity, context);
        }

        logUserActivity(
          context.user?.id || "anonymous",
          `${entityName}_created`,
          { entityId: (entity as any).id }
        );

        return NextResponse.json(
          {
            data: entity,
            meta: {
              message: `${entityName} created successfully`,
              requestId: context.requestId,
            },
          },
          { status: 201 }
        );
      },
      {
        ...options,
        validation: validation.create ? { body: validation.create } : undefined,
      }
    ),

    // PATCH /entity/:id - Update entity
    update: createPatchHandler(
      async (request, context, validated) => {
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const id = pathParts[pathParts.length - 1];
        let { body } = validated || {};

        // Apply before update hook
        if (handlers.beforeUpdate) {
          body = await handlers.beforeUpdate(id, body, context);
        }

        const entity = await measureAsync(
          `${entityName}_update`,
          () => operations.update(id, body),
          { entityName, entityId: id }
        );

        // Apply after update hook
        if (handlers.afterUpdate) {
          await handlers.afterUpdate(entity, context);
        }

        logUserActivity(
          context.user?.id || "anonymous",
          `${entityName}_updated`,
          { entityId: id }
        );

        return NextResponse.json({
          data: entity,
          meta: {
            message: `${entityName} updated successfully`,
            requestId: context.requestId,
          },
        });
      },
      {
        ...options,
        validation: validation.update ? { body: validation.update } : undefined,
      }
    ),

    // DELETE /entity/:id - Delete entity
    delete: createDeleteHandler(async (request, context) => {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const id = pathParts[pathParts.length - 1];

      // Apply before delete hook
      if (handlers.beforeDelete) {
        await handlers.beforeDelete(id, context);
      }

      const success = await measureAsync(
        `${entityName}_delete`,
        () => operations.delete(id),
        { entityName, entityId: id }
      );

      // Apply after delete hook
      if (handlers.afterDelete) {
        await handlers.afterDelete(id, context);
      }

      logUserActivity(
        context.user?.id || "anonymous",
        `${entityName}_deleted`,
        { entityId: id }
      );

      return NextResponse.json({
        data: { deleted: success },
        meta: {
          message: `${entityName} deleted successfully`,
          requestId: context.requestId,
        },
      });
    }, options),
  };
};
