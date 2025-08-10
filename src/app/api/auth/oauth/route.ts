/**
 * @fileoverview OAuth sign-in API endpoint
 * @description Handles OAuth provider sign-in initiation
 */

import { NextRequest } from "next/server";
import { oauthProviderSchema } from "@/lib/validation/schemas/auth-schemas";
import { signInWithOAuth } from "@/lib/auth/supabase-auth";
import { success, error } from "@/lib/api/api-responses";
import { validateOrThrow } from "@/lib/validation";
import { withErrorHandler } from "@/lib/errors";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/security";
import { logger } from "@/lib/logging";

/**
 * POST /api/auth/oauth
 * Initiate OAuth sign-in flow
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
      ...RATE_LIMIT_PRESETS.AUTH_LOGIN,
      identifier: clientIp,
    });

    if (!rateLimitResult.success) {
      logger.warn("OAuth rate limit exceeded", {
        requestId,
        ip: clientIp,
      });

      return error.rateLimited(
        "Too many OAuth attempts. Please wait before trying again.",
        rateLimitResult.retryAfter,
        requestId
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = validateOrThrow(oauthProviderSchema, body, {
      requestId,
    });

    logger.info("OAuth sign-in attempt", {
      requestId,
      provider: validatedData.provider,
      hasRedirectTo: !!validatedData.redirectTo,
    });

    // Initiate OAuth flow
    const result = await signInWithOAuth(
      validatedData.provider as "google" | "github" | "azure",
      validatedData.redirectTo
    );

    if (result.error) {
      logger.warn("OAuth initiation failed", {
        requestId,
        provider: validatedData.provider,
        error: result.error.message,
      });

      return error.badRequest(
        `Failed to initiate ${validatedData.provider} sign-in. Please try again.`,
        {
          provider: validatedData.provider,
          code: "OAUTH_INITIATION_FAILED",
        },
        requestId
      );
    }

    if (!result.data?.url) {
      logger.error("OAuth returned no URL", {
        requestId,
        provider: validatedData.provider,
      });

      return error.internal("Failed to generate OAuth URL", requestId);
    }

    logger.info("OAuth URL generated successfully", {
      requestId,
      provider: validatedData.provider,
    });

    return success.ok(
      {
        provider: validatedData.provider,
        authUrl: result.data.url,
        message: `Redirect to ${validatedData.provider} for authentication`,
      },
      requestId
    );
  } catch (err: unknown) {
    // Handle validation errors
    if (err.name === "ValidationError" || err.message?.includes("validation")) {
      logger.warn("OAuth validation failed", {
        requestId,
        error: err.message || err,
      });

      return error.validation(
        "Invalid OAuth request",
        Array.isArray(err.issues)
          ? err.issues
          : [{ message: err.message || "Invalid provider specified" }],
        requestId
      );
    }

    // Handle other errors
    logger.error("Unexpected error during OAuth initiation", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return error.internal(
      "OAuth sign-in failed due to server error",
      requestId
    );
  }
});

/**
 * GET /api/auth/oauth
 * Get available OAuth providers
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const requestId = crypto.randomUUID();

  try {
    const providers = {
      available: [
        {
          id: "google",
          name: "Google",
          icon: "/icons/google.svg",
          enabled: true,
        },
        {
          id: "github",
          name: "GitHub",
          icon: "/icons/github.svg",
          enabled: true,
        },
        {
          id: "azure",
          name: "Microsoft",
          icon: "/icons/microsoft.svg",
          enabled: false, // Enable when configured
        },
      ],
      callbackUrl: "/api/auth/callback",
    };

    return success.ok(providers, requestId);
  } catch (err: unknown) {
    logger.error("Error fetching OAuth providers", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });

    return error.internal("Failed to load OAuth providers", requestId);
  }
});
