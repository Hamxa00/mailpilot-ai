/**
 * @fileoverview Get current user API endpoint
 * @description Protected endpoint to get current authenticated user
 */

import { NextRequest } from "next/server";
import {
  getCurrentUser,
  requireAuth,
  updateUserMetadata,
} from "@/lib/auth/supabase-auth";
import { success, error } from "@/lib/api/api-responses";
import { withErrorHandler } from "@/lib/errors";
import { logger } from "@/lib/logging";

/**
 * GET /api/auth/user
 * Get current authenticated user information
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    // Authenticate the user first
    const user = await requireAuth(request);

    if (!user) {
      return error.unauthorized(
        "Authentication required",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    logger.debug("User profile retrieved", {
      userId: user.id,
      email: user.email,
    });

    return success.ok(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          role: user.role,
          emailVerified: user.email_confirmed_at != null,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.created_at,
        },
      },
      (request as NextRequest & { requestId?: string }).requestId
    );
  } catch (err) {
    logger.error("Error retrieving user profile", { error: err });
    return error.internal(
      "Failed to retrieve user profile",
      (request as NextRequest & { requestId?: string }).requestId
    );
  }
});

/**
 * PATCH /api/auth/user
 * Update current authenticated user information
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  try {
    // Authenticate the user first
    const user = await requireAuth(request);

    if (!user) {
      return error.unauthorized(
        "Authentication required",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, displayName, avatarUrl, phone } = body;

    // Validate input (basic validation)
    const updateData: unknown = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (phone !== undefined) updateData.phone = phone;

    // Check if we have anything to update
    if (Object.keys(updateData).length === 0) {
      return error.badRequest(
        "No valid fields provided to update",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    // Get authorization header for Bearer token support
    const authHeader = request.headers.get("authorization") || undefined;

    // Update user metadata
    const result = await updateUserMetadata(updateData, authHeader);

    if (result.error) {
      logger.error("User update failed", {
        userId: user.id,
        error: result.error.message,
      });

      return error.badRequest(
        "Failed to update user information",
        (request as NextRequest & { requestId?: string }).requestId
      );
    }

    logger.info("User profile updated", {
      userId: user.id,
      updatedFields: Object.keys(updateData),
    });

    return success.ok(
      {
        user: {
          id: result.user?.id || user.id,
          email: result.user?.email || user.email,
          firstName:
            result.user?.user_metadata?.firstName || updateData.firstName,
          lastName: result.user?.user_metadata?.lastName || updateData.lastName,
          displayName:
            result.user?.user_metadata?.displayName || updateData.displayName,
          role: user.role,
          emailVerified: result.user?.email_confirmed_at != null,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: result.user?.created_at || user.created_at,
        },
        message: "User profile updated successfully",
      },
      (request as NextRequest & { requestId?: string }).requestId
    );
  } catch (err) {
    logger.error("Error updating user profile", { error: err });
    return error.internal(
      "Failed to update user profile",
      (request as NextRequest & { requestId?: string }).requestId
    );
  }
});
