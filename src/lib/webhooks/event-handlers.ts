/**
 * @fileoverview Supabase webhook event handlers
 * @description Centralized webhook event handlers for Supabase Auth events
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { logger } from "../logging";
import {
  createUser,
  updateUser,
  deactivateUser,
  updateLastLogin,
  transformSupabaseUser,
  userExists,
} from "./database-sync";
import type {
  SupabaseAuthWebhookPayload,
  SupabaseAuthEventType,
  WebhookHandlerResult,
} from "./types";

/**
 * Handle user.created event
 * Called when a new user registers via Supabase Auth
 */
export async function handleUserCreated(
  payload: SupabaseAuthWebhookPayload
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Processing user.created webhook", {
      userId: payload.record.id,
      email: payload.record.email,
      provider: payload.record.app_metadata?.provider,
    });

    // Check if user already exists (edge case)
    const exists = await userExists(payload.record.id);
    if (exists) {
      logger.warn("User already exists in database, updating instead", {
        userId: payload.record.id,
      });

      const userData = transformSupabaseUser(payload.record);
      return await updateUser(userData);
    }

    // Create new user record
    const userData = transformSupabaseUser(payload.record);
    const result = await createUser(userData);

    if (result.success) {
      logger.info("User created successfully via webhook", {
        userId: payload.record.id,
        email: payload.record.email,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error handling user.created webhook", {
      userId: payload.record.id,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to handle user creation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle user.updated event
 * Called when user metadata is updated in Supabase Auth
 */
export async function handleUserUpdated(
  payload: SupabaseAuthWebhookPayload
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Processing user.updated webhook", {
      userId: payload.record.id,
      email: payload.record.email,
    });

    const userData = transformSupabaseUser(payload.record);
    const result = await updateUser(userData);

    if (result.success) {
      logger.info("User updated successfully via webhook", {
        userId: payload.record.id,
        email: payload.record.email,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error handling user.updated webhook", {
      userId: payload.record.id,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to handle user update",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle user.deleted event
 * Called when user is deleted from Supabase Auth
 */
export async function handleUserDeleted(
  payload: SupabaseAuthWebhookPayload
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Processing user.deleted webhook", {
      userId: payload.record.id,
      email: payload.record.email,
    });

    const result = await deactivateUser(payload.record.id);

    if (result.success) {
      logger.info("User deactivated successfully via webhook", {
        userId: payload.record.id,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error handling user.deleted webhook", {
      userId: payload.record.id,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to handle user deletion",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle user.signed_in event
 * Called when user signs in via Supabase Auth
 */
export async function handleUserSignedIn(
  payload: SupabaseAuthWebhookPayload
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Processing user.signed_in webhook", {
      userId: payload.record.id,
      email: payload.record.email,
      lastSignIn: payload.record.last_sign_in_at,
    });

    if (!payload.record.last_sign_in_at) {
      return {
        success: false,
        message: "No sign-in timestamp provided",
        error: "Missing last_sign_in_at",
      };
    }

    const result = await updateLastLogin(
      payload.record.id,
      payload.record.last_sign_in_at
    );

    if (result.success) {
      logger.info("User login time updated successfully via webhook", {
        userId: payload.record.id,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error handling user.signed_in webhook", {
      userId: payload.record.id,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to handle user sign-in",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle user.signed_out event
 * Called when user signs out via Supabase Auth
 */
export async function handleUserSignedOut(
  payload: SupabaseAuthWebhookPayload
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Processing user.signed_out webhook", {
      userId: payload.record.id,
      email: payload.record.email,
    });

    // For sign-out, we might want to log the event but don't need to update database
    // You can add any custom sign-out logic here (e.g., invalidating sessions, logging)

    return {
      success: true,
      message: "User sign-out processed successfully",
    };
  } catch (error) {
    logger.error("Error handling user.signed_out webhook", {
      userId: payload.record.id,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to handle user sign-out",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Main webhook event dispatcher
 */
export async function handleWebhookEvent(
  payload: SupabaseAuthWebhookPayload
): Promise<WebhookHandlerResult> {
  const { type } = payload;

  logger.info("Received Supabase Auth webhook", {
    eventType: type,
    userId: payload.record?.id,
    email: payload.record?.email,
    table: payload.table,
  });

  switch (type) {
    case "user.created":
      return await handleUserCreated(payload);

    case "user.updated":
      return await handleUserUpdated(payload);

    case "user.deleted":
      return await handleUserDeleted(payload);

    case "user.signed_in":
      return await handleUserSignedIn(payload);

    case "user.signed_out":
      return await handleUserSignedOut(payload);

    default:
      logger.warn("Unhandled webhook event type", { eventType: type });
      return {
        success: false,
        message: `Unhandled event type: ${type}`,
        error: `Event type '${type}' is not supported`,
      };
  }
}
