/**
 * @fileoverview Webhook security utilities
 * @description Security verification for Supabase webhooks (signature & timestamp validation)
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { logger } from "../logging";
import { env } from "../config";

/**
 * Verify Supabase webhook signature
 */
export function verifySupabaseWebhook(
  request: NextRequest,
  payload: string
): boolean {
  try {
    const signature = request.headers.get("x-supabase-signature");

    if (!signature) {
      logger.warn("Missing Supabase webhook signature");
      return false;
    }

    // Get webhook secret from environment
    const webhookSecret = env.SUPABASE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("SUPABASE_WEBHOOK_SECRET not configured");
      return false;
    }

    // Create expected signature
    const expectedSignature = createHash("sha256")
      .update(`${payload}${webhookSecret}`)
      .digest("hex");

    const providedSignature = signature.replace("sha256=", "");

    // Use timing-safe comparison
    const isValid = timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    );

    if (!isValid) {
      logger.warn("Invalid Supabase webhook signature", {
        provided: providedSignature.substring(0, 10) + "...",
        expected: expectedSignature.substring(0, 10) + "...",
      });
    }

    return isValid;
  } catch (error) {
    logger.error("Error verifying Supabase webhook signature", { error });
    return false;
  }
}

/**
 * Verify webhook timestamp to prevent replay attacks
 */
export function verifyWebhookTimestamp(
  request: NextRequest,
  toleranceSeconds: number = 300 // 5 minutes
): boolean {
  try {
    const timestamp = request.headers.get("x-supabase-timestamp");

    if (!timestamp) {
      logger.warn("Missing webhook timestamp");
      return false;
    }

    const webhookTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - webhookTime);

    if (timeDifference > toleranceSeconds) {
      logger.warn("Webhook timestamp outside tolerance", {
        webhookTime,
        currentTime,
        difference: timeDifference,
        tolerance: toleranceSeconds,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error verifying webhook timestamp", { error });
    return false;
  }
}
