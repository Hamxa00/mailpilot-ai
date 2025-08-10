/**
 * @fileoverview User logout API endpoint
 * @description Handles user logout and session cleanup
 */

import { NextRequest } from "next/server";
import { signOutUser } from "@/lib/auth/supabase-auth";
import { success, error } from "@/lib/api/api-responses";
import { withErrorHandler } from "@/lib/errors";
import { logger, logUserActivity } from "@/lib/logging";
import { getAuthUser } from "@/lib/auth/auth-middleware";

/**
 * POST /api/auth/logout
 * Sign out current user
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const requestId = crypto.randomUUID();
  (request as NextRequest & { requestId?: string }).requestId = requestId;

  try {
    // Get user info before logout for logging
    const user = getAuthUser(request);
    const userId = user?.id;
    const userEmail = user?.email;

    logger.info("User logout attempt", {
      requestId,
      userId,
      email: userEmail,
    });

    // Perform logout
    const result = await signOutUser(request);

    if (result.error) {
      logger.warn("User logout failed", {
        requestId,
        userId,
        error: result.error.message,
      });

      return error.internal("Logout failed. Please try again.", requestId);
    }

    // Log user activity
    if (userId) {
      await logUserActivity(userId, "USER_LOGGED_OUT", {
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("User logout successful", {
      requestId,
      userId,
      email: userEmail,
    });

    // Create response with cleared auth cookies
    const response = success.ok(
      {
        message: "Successfully logged out",
        timestamp: new Date().toISOString(),
      },
      requestId
    );

    // Clear authentication cookies
    response.cookies.set({
      name: "sb-access-token",
      value: "",
      maxAge: 0,
      path: "/",
    });

    response.cookies.set({
      name: "sb-refresh-token",
      value: "",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    logger.error("Unexpected error during logout", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });

    return error.internal("Logout failed due to server error", requestId);
  }
});
