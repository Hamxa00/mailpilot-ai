/**
 * @fileoverview Session refresh API endpoint
 * @description Handles session refresh with Supabase
 */

import { NextRequest } from "next/server";
import { refreshSession } from "@/lib/auth/supabase-auth";
import { success, error } from "@/lib/api/api-responses";
import { withErrorHandler } from "@/lib/errors";
import { logger } from "@/lib/logging";

/**
 * POST /api/auth/refresh
 * Refresh user session and tokens
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const requestId = crypto.randomUUID();
  (request as any).requestId = requestId;

  try {
    logger.debug("Session refresh attempt", { requestId });

    let refreshToken: string | undefined;

    // Try to get refresh token from request body
    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // Body might be empty, that's okay
    }

    // Attempt to refresh session
    const result = await refreshSession(refreshToken);

    if (result.error) {
      logger.warn("Session refresh failed", {
        requestId,
        error: result.error.message,
      });

      return error.unauthorized(
        "Session refresh failed. Please sign in again.",
        requestId
      );
    }

    if (!result.session || !result.user) {
      logger.warn("Session refresh returned no session", {
        requestId,
      });

      return error.unauthorized(
        "Invalid session. Please sign in again.",
        requestId
      );
    }

    logger.info("Session refresh successful", {
      requestId,
      userId: result.user?.id,
    });

    return success.ok(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role || "user",
          emailVerified: result.user.email_confirmed_at != null,
          lastLoginAt: result.user.lastLoginAt,
        },
        session: {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresAt: new Date(result.session.expires_at! * 1000).toISOString(),
        },
        refreshedAt: new Date().toISOString(),
      },
      requestId
    );
  } catch (err: any) {
    logger.error("Unexpected error during session refresh", {
      requestId,
      error: err?.message || err,
    });

    return error.internal(
      "Session refresh failed due to server error",
      requestId
    );
  }
});
