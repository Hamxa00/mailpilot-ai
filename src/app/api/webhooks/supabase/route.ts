/**
 * @fileoverview Supabase Auth webhook endpoint
 * @description Handles Supabase Auth webhooks for user synchronization
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { success, error } from "@/lib/api/api-responses";
import { logger } from "@/lib/logging";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/security";
import {
  verifySupabaseWebhook,
  verifyWebhookTimestamp,
  handleWebhookEvent,
} from "@/lib/webhooks";
import type { SupabaseAuthWebhookPayload } from "@/lib/webhooks";

/**
 * Webhook payload validation schema
 */
const webhookPayloadSchema = z.object({
  type: z.enum([
    "user.created",
    "user.updated",
    "user.deleted",
    "user.signed_in",
    "user.signed_out",
  ]),
  table: z.literal("auth.users"),
  schema: z.literal("auth"),
  record: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    email_confirmed_at: z.string().nullable(),
    phone: z.string().nullable(),
    phone_confirmed_at: z.string().nullable(),
    confirmation_sent_at: z.string().nullable(),
    confirmed_at: z.string().nullable(),
    last_sign_in_at: z.string().nullable(),
    app_metadata: z
      .object({
        provider: z.string(),
        providers: z.array(z.string()),
      })
      .catchall(z.unknown()),
    user_metadata: z.record(z.string(), z.unknown()),
    identities: z.array(
      z.object({
        identity_id: z.string(),
        id: z.string(),
        user_id: z.string(),
        identity_data: z.record(z.string(), z.unknown()),
        provider: z.string(),
        last_sign_in_at: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
      })
    ),
    created_at: z.string(),
    updated_at: z.string(),
    is_anonymous: z.boolean().optional(),
    aud: z.string(),
    role: z.string(),
  }),
  old_record: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      email_confirmed_at: z.string().nullable(),
      phone: z.string().nullable(),
      phone_confirmed_at: z.string().nullable(),
      confirmation_sent_at: z.string().nullable(),
      confirmed_at: z.string().nullable(),
      last_sign_in_at: z.string().nullable(),
      app_metadata: z
        .object({
          provider: z.string(),
          providers: z.array(z.string()),
        })
        .catchall(z.unknown()),
      user_metadata: z.record(z.string(), z.unknown()),
      identities: z.array(
        z.object({
          identity_id: z.string(),
          id: z.string(),
          user_id: z.string(),
          identity_data: z.record(z.string(), z.unknown()),
          provider: z.string(),
          last_sign_in_at: z.string(),
          created_at: z.string(),
          updated_at: z.string(),
        })
      ),
      created_at: z.string(),
      updated_at: z.string(),
      is_anonymous: z.boolean().optional(),
      aud: z.string(),
      role: z.string(),
    })
    .nullable()
    .optional(),
});

/**
 * POST /api/webhooks/supabase
 * Handle Supabase Auth webhooks
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const requestId = (request as any).requestId;

  try {
    // Rate limiting for webhook endpoint
    const rateLimitResult = await checkRateLimit({
      ...RATE_LIMIT_PRESETS.WEBHOOK,
      identifier: `webhook:${
        request.headers.get("x-forwarded-for") || "unknown"
      }`,
    });

    if (!rateLimitResult.success) {
      logger.warn("Webhook rate limit exceeded", {
        requestId,
        identifier: request.headers.get("x-forwarded-for"),
      });

      return error.rateLimited(
        "Too many webhook requests",
        rateLimitResult.retryAfter,
        requestId
      );
    }

    // Get request body
    const rawBody = await request.text();

    if (!rawBody) {
      logger.warn("Empty webhook payload received", { requestId });
      return error.badRequest("Empty request body", requestId);
    }

    // Verify webhook signature
    if (!verifySupabaseWebhook(request, rawBody)) {
      logger.warn("Invalid webhook signature", { requestId });
      return error.unauthorized("Invalid webhook signature", requestId);
    }

    // Verify webhook timestamp (prevent replay attacks)
    if (!verifyWebhookTimestamp(request)) {
      logger.warn("Invalid webhook timestamp", { requestId });
      return error.unauthorized("Invalid webhook timestamp", requestId);
    }

    // Parse and validate payload
    let payload: SupabaseAuthWebhookPayload;
    try {
      const parsedBody = JSON.parse(rawBody);
      payload = webhookPayloadSchema.parse(parsedBody);
    } catch (parseError) {
      logger.error("Invalid webhook payload format", {
        requestId,
        error: parseError instanceof Error ? parseError.message : parseError,
      });

      return error.badRequest("Invalid webhook payload format", requestId);
    }

    logger.info("Processing Supabase webhook", {
      requestId,
      eventType: payload.type,
      userId: payload.record.id,
      email: payload.record.email,
    });

    // Process the webhook event
    const result = await handleWebhookEvent(payload);

    if (!result.success) {
      logger.error("Webhook processing failed", {
        requestId,
        eventType: payload.type,
        userId: payload.record.id,
        error: result.error,
        message: result.message,
      });

      return error.internal(
        `Webhook processing failed: ${result.message}`,
        requestId
      );
    }

    logger.info("Webhook processed successfully", {
      requestId,
      eventType: payload.type,
      userId: payload.record.id,
      message: result.message,
    });

    return success.ok(
      {
        message: result.message,
        eventType: payload.type,
        userId: payload.record.id,
        processed: true,
        timestamp: new Date().toISOString(),
      },
      requestId
    );
  } catch (err) {
    logger.error("Unexpected error in webhook handler", {
      requestId,
      error: err instanceof Error ? err.message : err,
    });

    return error.internal(
      "Webhook processing failed due to server error",
      requestId
    );
  }
});

/**
 * GET /api/webhooks/supabase
 * Webhook health check endpoint
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const requestId = (request as any).requestId;

  return success.ok(
    {
      message: "Supabase webhook endpoint is healthy",
      timestamp: new Date().toISOString(),
      endpoint: "supabase-auth-webhook",
      version: "1.0.0",
    },
    requestId
  );
});
