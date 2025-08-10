/**
 * @fileoverview Authentication middleware for API routes
 * @description Middleware functions for protecting API routes with Supabase auth
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getCurrentSession,
  requireAuth,
  requireRole,
  type ExtendedUser,
} from "./supabase-auth";
import { AuthenticationError, AuthorizationError } from "../errors";
import { logger } from "../logging";
import { error } from "../api/api-responses";

/**
 * Authentication context for API routes
 */
export interface AuthContext {
  user: ExtendedUser;
  session: any;
}

/**
 * Middleware options
 */
export interface AuthMiddlewareOptions {
  /** Required user roles */
  requiredRoles?: Array<"user" | "admin" | "moderator">;
  /** Allow inactive users */
  allowInactive?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Authentication middleware factory
 */
export const withAuth = (options: AuthMiddlewareOptions = {}) => {
  return async (
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      let user: ExtendedUser;

      // Check for required roles
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        user = await requireRole(request, options.requiredRoles);
      } else {
        user = await requireAuth(request);
      }

      // Check if user is active (unless specifically allowed)
      if (!options.allowInactive && !user.isActive) {
        logger.warn("Inactive user attempted to access protected route", {
          userId: user.id,
          email: user.email,
          path: request.nextUrl?.pathname || request.url || "unknown",
        });

        return error.forbidden(
          "Account is inactive",
          (request as NextRequest & { requestId?: string }).requestId
        );
      }

      // Add user to request object for access in API handlers
      (request as any).user = user;
      (request as any).auth = {
        user,
        session: await getCurrentSession(request),
      };

      logger.debug("User authenticated for API request", {
        userId: user.id,
        role: user.role,
        path: request.nextUrl?.pathname || request.url || "unknown",
      });

      return next();
    } catch (err) {
      const errorMessage = options.errorMessage || "Authentication required";

      if (err instanceof AuthenticationError) {
        logger.warn("Authentication failed for API request", {
          error: err.message,
          path: request.nextUrl?.pathname || request.url || "unknown",
          ip: request.headers.get("x-forwarded-for") || "unknown",
        });

        return error.unauthorized(errorMessage, (request as NextRequest & { requestId?: string }).requestId);
      }

      if (err instanceof AuthorizationError) {
        logger.warn("Authorization failed for API request", {
          error: err.message,
          path: request.nextUrl.pathname,
          ip: request.headers.get("x-forwarded-for") || "unknown",
        });

        return error.forbidden(
          "Insufficient permissions",
          (request as NextRequest & { requestId?: string }).requestId
        );
      }

      logger.error("Unexpected error in auth middleware", {
        error: err,
        path: request.nextUrl.pathname,
      });

      return error.internal(
        "Internal server error",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }
  };
};

/**
 * Optional authentication middleware (doesn't require auth but adds user context if available)
 */
export const withOptionalAuth = () => {
  return async (
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser(request);
      const session = await getCurrentSession(request);

      // Add to request object if available
      (request as any).user = user;
      (request as any).auth = {
        user,
        session,
      };

      if (user) {
        logger.debug("Optional auth - user found", {
          userId: user.id,
          path: request.nextUrl.pathname,
        });
      } else {
        logger.debug("Optional auth - no user", {
          path: request.nextUrl.pathname,
        });
      }

      return next();
    } catch (err) {
      // For optional auth, we don't throw errors, just continue without user
      logger.debug("Optional auth - error getting user", {
        error: err,
        path: request.nextUrl.pathname,
      });

      (request as any).user = null;
      (request as any).auth = { user: null, session: null };

      return next();
    }
  };
};

/**
 * Admin-only middleware
 */
export const withAdminAuth = (
  options: Omit<AuthMiddlewareOptions, "requiredRoles"> = {}
) => {
  return withAuth({
    ...options,
    requiredRoles: ["admin"],
  });
};

/**
 * User or higher middleware (user, moderator, admin)
 */
export const withUserAuth = (
  options: Omit<AuthMiddlewareOptions, "requiredRoles"> = {}
) => {
  return withAuth({
    ...options,
    requiredRoles: ["user", "moderator", "admin"],
  });
};

/**
 * Moderator or higher middleware (moderator, admin)
 */
export const withModeratorAuth = (
  options: Omit<AuthMiddlewareOptions, "requiredRoles"> = {}
) => {
  return withAuth({
    ...options,
    requiredRoles: ["moderator", "admin"],
  });
};

/**
 * Extract authenticated user from request
 */
export const getAuthUser = (request: NextRequest): ExtendedUser | null => {
  return (request as any).user || null;
};

/**
 * Extract auth context from request
 */
export const getAuthContext = (request: NextRequest): AuthContext | null => {
  const auth = (request as any).auth;
  return auth?.user ? auth : null;
};

/**
 * Verify user has specific permission
 */
export const hasPermission = (
  user: ExtendedUser | null,
  requiredRole: "user" | "moderator" | "admin"
): boolean => {
  if (!user || !user.role) return false;

  const roleHierarchy = {
    user: 1,
    moderator: 2,
    admin: 3,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};

/**
 * Verify user can access resource (same user or higher role)
 */
export const canAccessUserResource = (
  currentUser: ExtendedUser | null,
  targetUserId: string,
  minimumRole: "moderator" | "admin" = "moderator"
): boolean => {
  if (!currentUser) return false;

  // Users can access their own resources
  if (currentUser.id === targetUserId) return true;

  // Or if they have sufficient role
  return hasPermission(currentUser, minimumRole);
};

/**
 * Create auth-enhanced API handler
 */
export const createAuthApiHandler = (
  handler: (
    request: NextRequest,
    context: AuthContext
  ) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authMiddleware = withAuth(options);

    return authMiddleware(request, async () => {
      const authContext = getAuthContext(request);
      if (!authContext) {
        return error.internal(
          "Authentication context missing",
          (request as NextRequest & { requestId?: string }).requestId
        );
      }

      return handler(request, authContext);
    });
  };
};
