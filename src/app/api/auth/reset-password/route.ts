/**
 * @fileoverview Password reset API endpoint
 * @description Handles password reset requests with Supabase
 */

import { NextRequest } from "next/server";
import { supabasePasswordResetSchema } from "@/lib/validation/schemas/auth-schemas";
import { resetPassword } from "@/lib/auth/supabase-auth";
import { success, error } from "@/lib/api/api-responses";
import { validateOrThrow } from "@/lib/validation";
import { withErrorHandler } from "@/lib/errors";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/security";
import { logger, logUserActivity } from "@/lib/logging";

/**
 * POST /api/auth/reset-password
 * Request password reset email
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const requestId = crypto.randomUUID();
  (request as NextRequest & { requestId?: string }).requestId = requestId;

  try {
    // Check rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = await checkRateLimit({
      ...RATE_LIMIT_PRESETS.PASSWORD_RESET,
      identifier: clientIp,
    });

    if (!rateLimitResult.success) {
      logger.warn("Password reset rate limit exceeded", {
        requestId,
        ip: clientIp,
      });

      return error.rateLimited(
        "Too many password reset requests. Please wait before trying again.",
        rateLimitResult.retryAfter,
        requestId
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validateOrThrow(supabasePasswordResetSchema, body, {
      requestId,
    });

    logger.info("Password reset request", {
      requestId,
      email: validatedData.email,
      hasRedirectTo: !!validatedData.redirectTo,
    });

    // Request password reset
    const result = await resetPassword(
      validatedData.email,
      validatedData.redirectTo
    );

    if (result.error) {
      logger.warn("Password reset request failed", {
        requestId,
        email: validatedData.email,
        error: result.error.message,
      });

      // Don't reveal if email exists or not for security
      // Always return success message
    }

    // Always log the attempt (but don't reveal if user exists)
    logger.info("Password reset email sent (or would be sent)", {
      requestId,
      email: validatedData.email,
    });

    return success.ok(
      {
        message:
          "If an account with this email exists, you will receive a password reset link shortly.",
        email: validatedData.email,
        timestamp: new Date().toISOString(),
      },
      requestId
    );
  } catch (err: unknown) {
    // Handle validation errors
    if (err.name === "ValidationError" || err.message?.includes("validation")) {
      logger.warn("Password reset validation failed", {
        requestId,
        error: err.message || err,
      });

      return error.validation(
        "Please provide a valid email address",
        Array.isArray(err.issues) ? err.issues : [{ message: err.message }],
        requestId
      );
    }

    // Handle other errors
    logger.error("Unexpected error during password reset request", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return error.internal(
      "Password reset request failed due to server error",
      requestId
    );
  }
});
