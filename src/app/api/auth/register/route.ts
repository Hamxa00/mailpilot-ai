/**
 * @fileoverview User registration API endpoint
 * @description Handles user registration with Supabase Auth and database sync
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest } from "next/server";
import { supabaseRegistrationSchema } from "@/lib/validation/schemas/auth-schemas";
import { success, error } from "@/lib/api/api-responses";
import { validateOrThrow } from "@/lib/validation";
import { withErrorHandler } from "@/lib/errors";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/security";
import { logger } from "@/lib/logging";
import { registerUser } from "@/lib/auth";

/**
 * GET /api/auth/register
 * Get registration requirements and configuration
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const requestId = (request as any).requestId;

  return success.ok(
    {
      message: "Registration endpoint ready",
      requirements: {
        email: {
          required: true,
          format: "Valid email address",
        },
        password: {
          required: true,
          minLength: 8,
          requirements: [
            "At least 8 characters",
            "At least one uppercase letter",
            "At least one lowercase letter",
            "At least one number",
            "At least one special character",
          ],
        },
        firstName: {
          required: true,
          minLength: 2,
          maxLength: 50,
        },
        lastName: {
          required: true,
          minLength: 2,
          maxLength: 50,
        },
        acceptTerms: {
          required: true,
          value: true,
        },
        acceptMarketing: {
          required: false,
          default: false,
        },
        referralCode: {
          required: false,
          format: "6-12 alphanumeric characters",
        },
      },
      endpoints: {
        register: "/api/auth/register",
        login: "/api/auth/login",
        oauth: "/api/auth/oauth",
      },
    },
    requestId
  );
});

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const requestId = (request as any).requestId;

  try {
    // Check rate limiting
    const rateLimitResult = await checkRateLimit({
      ...RATE_LIMIT_PRESETS.AUTH_LOGIN, // Use same rate limit as login
      identifier: request.headers.get("x-forwarded-for") || "unknown",
    });

    if (!rateLimitResult.success) {
      logger.warn("Registration rate limit exceeded", {
        requestId,
        identifier: request.headers.get("x-forwarded-for"),
      });

      return error.rateLimited(
        "Too many registration attempts",
        rateLimitResult.retryAfter,
        requestId
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validateOrThrow(supabaseRegistrationSchema, body, {
      requestId,
    });

    logger.info("User registration attempt", {
      requestId,
      email: validatedData.email,
      referralCode: validatedData.referralCode,
    });

    // Use the centralized registration service
    const result = await registerUser(
      {
        email: validatedData.email,
        password: validatedData.password,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        acceptTerms: validatedData.acceptTerms,
        acceptMarketing: validatedData.acceptMarketing,
        referralCode: validatedData.referralCode,
      },
      requestId
    );

    if (!result.success) {
      logger.warn("User registration failed", {
        requestId,
        email: validatedData.email,
        error: result.error,
        errorCode: result.errorCode,
      });

      // Map error codes to appropriate HTTP responses
      switch (result.errorCode) {
        case "USER_ALREADY_EXISTS":
          return error.conflict(result.message, requestId);
        case "INVALID_PASSWORD":
          return error.badRequest(result.message, requestId);
        case "REGISTRATION_FAILED":
          return error.badRequest(result.message, requestId);
        default:
          return error.internal(result.message, requestId);
      }
    }

    logger.info("User registration completed successfully", {
      requestId,
      userId: result.user?.id,
      email: result.user?.email,
      needsVerification: result.needsVerification,
    });

    return success.created(
      {
        message: result.message,
        user: result.user,
        needsVerification: result.needsVerification,
        session: result.session,
      },
      requestId
    );
  } catch (err) {
    logger.error("Unexpected error during registration", {
      requestId,
      error: err instanceof Error ? err.message : err,
    });

    return error.internal("Registration failed due to server error", requestId);
  }
});
