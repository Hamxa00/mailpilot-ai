/**
 * @fileoverview Database synchronization service
 * @description Handles syncing Supabase Auth users with custom database schema
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { logger } from "../logging";
import {
  getDatabase,
  initializeDatabase,
  getDatabaseStatus,
} from "../database";
import { user } from "../../db/schema";
import { eq } from "drizzle-orm";
import type {
  SupabaseAuthUser,
  UserSyncData,
  WebhookHandlerResult,
} from "./types";

/**
 * Transform Supabase Auth user to our user schema format
 */
export function transformSupabaseUser(
  authUser: SupabaseAuthUser
): UserSyncData {
  // Extract name information from user_metadata or app_metadata
  const firstName =
    authUser.user_metadata?.first_name ||
    authUser.user_metadata?.given_name ||
    authUser.user_metadata?.name?.split(" ")[0] ||
    null;

  const lastName =
    authUser.user_metadata?.last_name ||
    authUser.user_metadata?.family_name ||
    (authUser.user_metadata?.name?.split(" ").length > 1
      ? authUser.user_metadata.name.split(" ").slice(1).join(" ")
      : null) ||
    null;

  // Get avatar/profile image
  const imageUrl =
    authUser.user_metadata?.avatar_url ||
    authUser.user_metadata?.picture ||
    authUser.user_metadata?.photo ||
    null;

  return {
    id: authUser.id,
    emailAddress: authUser.email,
    firstName,
    lastName,
    imageUrl,
    emailVerified: authUser.email_confirmed_at !== null,
    lastLoginAt: authUser.last_sign_in_at,
  };
}

/**
 * Create user record in our database
 */
export async function createUser(
  userData: UserSyncData
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Creating user in database", {
      userId: userData.id,
      email: userData.emailAddress,
    });

    // Ensure database is initialized
    try {
      const status = getDatabaseStatus();
      if (!status.connected) {
        logger.info("Database not connected, initializing...");
        await initializeDatabase();
      }
    } catch (initError) {
      logger.warn("Failed to initialize database, attempting to continue", {
        error: initError instanceof Error ? initError.message : initError,
      });
    }

    const db = getDatabase();
    const newUser = await db
      .insert(user)
      .values({
        id: userData.id,
        emailAddress: userData.emailAddress,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        emailVerified: userData.emailVerified,
        lastLoginAt: userData.lastLoginAt
          ? new Date(userData.lastLoginAt)
          : null,
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: user.id,
        emailAddress: user.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      });

    logger.info("User created successfully", {
      userId: userData.id,
      email: userData.emailAddress,
    });

    return {
      success: true,
      message: "User created successfully",
      data: newUser[0],
    };
  } catch (error) {
    logger.error("Failed to create user in database", {
      userId: userData.id,
      email: userData.emailAddress,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update existing user record
 */
export async function updateUser(
  userData: UserSyncData
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Updating user in database", {
      userId: userData.id,
      email: userData.emailAddress,
    });

    // Ensure database is initialized
    try {
      const status = getDatabaseStatus();
      if (!status.connected) {
        logger.info("Database not connected, initializing...");
        await initializeDatabase();
      }
    } catch (initError) {
      logger.warn("Failed to initialize database, attempting to continue", {
        error: initError instanceof Error ? initError.message : initError,
      });
    }

    const db = getDatabase();
    const updatedUser = await db
      .update(user)
      .set({
        emailAddress: userData.emailAddress,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        emailVerified: userData.emailVerified,
        lastLoginAt: userData.lastLoginAt
          ? new Date(userData.lastLoginAt)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userData.id))
      .returning({
        id: user.id,
        emailAddress: user.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      });

    if (updatedUser.length === 0) {
      logger.warn("No user found to update, creating new user", {
        userId: userData.id,
      });
      return await createUser(userData);
    }

    logger.info("User updated successfully", {
      userId: userData.id,
      email: userData.emailAddress,
    });

    return {
      success: true,
      message: "User updated successfully",
      data: updatedUser[0],
    };
  } catch (error) {
    logger.error("Failed to update user in database", {
      userId: userData.id,
      email: userData.emailAddress,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to update user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Soft delete user (set inactive)
 */
export async function deactivateUser(
  userId: string
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Deactivating user", { userId });

    const db = getDatabase();
    const deactivatedUser = await db
      .update(user)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        emailAddress: user.emailAddress,
        isActive: user.isActive,
      });

    if (deactivatedUser.length === 0) {
      logger.warn("No user found to deactivate", { userId });
      return {
        success: false,
        message: "User not found",
        error: "User not found in database",
      };
    }

    logger.info("User deactivated successfully", { userId });

    return {
      success: true,
      message: "User deactivated successfully",
      data: deactivatedUser[0],
    };
  } catch (error) {
    logger.error("Failed to deactivate user", {
      userId,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to deactivate user",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(
  userId: string,
  loginTime: string
): Promise<WebhookHandlerResult> {
  try {
    logger.info("Updating last login time", { userId, loginTime });

    // Ensure database is initialized
    try {
      const status = getDatabaseStatus();
      if (!status.connected) {
        logger.info("Database not connected, initializing...");
        await initializeDatabase();
      }
    } catch (initError) {
      logger.warn("Failed to initialize database, attempting to continue", {
        error: initError instanceof Error ? initError.message : initError,
      });
    }

    const db = getDatabase();
    const updatedUser = await db
      .update(user)
      .set({
        lastLoginAt: new Date(loginTime),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        lastLoginAt: user.lastLoginAt,
      });

    if (updatedUser.length === 0) {
      logger.warn("No user found to update login time", { userId });
      return {
        success: false,
        message: "User not found for login update",
        error: "User not found in database",
      };
    }

    logger.info("Last login time updated successfully", { userId });

    return {
      success: true,
      message: "Last login updated successfully",
      data: updatedUser[0],
    };
  } catch (error) {
    logger.error("Failed to update last login time", {
      userId,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Failed to update last login",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if user exists in our database
 */
export async function userExists(userId: string): Promise<boolean> {
  try {
    // Ensure database is initialized
    try {
      const status = getDatabaseStatus();
      if (!status.connected) {
        logger.info("Database not connected, initializing...");
        await initializeDatabase();
      }
    } catch (initError) {
      logger.warn("Failed to initialize database, attempting to continue", {
        error: initError instanceof Error ? initError.message : initError,
      });
    }

    const db = getDatabase();
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return existingUser.length > 0;
  } catch (error) {
    logger.error("Error checking if user exists", {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
}
