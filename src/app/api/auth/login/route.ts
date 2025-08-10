/**
 * @fileoverview User login API endpoint
 * @description Handles user login with Supabase
 */

import { NextRequest } from "next/server";
import { supabaseLoginSchema } from "@/lib/validation/schemas/auth-schemas";
import { signInUser } from "@/lib/auth/supabase-auth";
import { success, error } from "@/lib/api/api-responses";
import { validateOrThrow } from "@/lib/validation";
import { withErrorHandler } from "@/lib/errors";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/security";
import { logger } from "@/lib/logging";

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    // Check rate limiting
    const rateLimitResult = await checkRateLimit({
      ...RATE_LIMIT_PRESETS.AUTH_LOGIN,
      identifier: request.headers.get("x-forwarded-for") || "unknown",
    });

    if (!rateLimitResult.success) {
      return error.rateLimited(
        "Too many login attempts",
        rateLimitResult.retryAfter,
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validateOrThrow(supabaseLoginSchema, body, {
      requestId: (request as NextRequest & { requestId?: string }).requestId,
    });

    logger.info("User login attempt", {
      email: validatedData.email,
      rememberMe: validatedData.rememberMe,
    });

    const result = await signInUser(
      validatedData.email,
      validatedData.password
    );

    if (result.error) {
      logger.warn("User login failed", {
        email: validatedData.email,
        error: result.error.message,
      });

      return error.unauthorized(
        "Invalid credentials",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    if (!result.session) {
      logger.warn("Login successful but no session created", {
        email: validatedData.email,
        userId: result.user?.id,
      });

      return error.forbidden(
        "Please verify your email before signing in",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    logger.info("User login successful", {
      email: validatedData.email,
      userId: result.user?.id,
    });

    return success.ok(
      {
        user: {
          id: result.user?.id,
          email: result.user?.email,
          firstName: result.user?.firstName,
          lastName: result.user?.lastName,
          role: result.user?.role || "user",
          emailVerified: result.user?.email_confirmed_at != null,
          lastLoginAt: new Date().toISOString(),
        },
        session: {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresAt: new Date(result.session.expires_at! * 1000).toISOString(),
        },
      },
      (request as NextRequest & { requestId?: string }).requestId
    );
  } catch (err) {
    logger.error("Unexpected error during login", { error: err });
    return error.internal(
      "Login failed due to server error",
      (request as NextRequest & { requestId?: string }).requestId
    );
  }
});
