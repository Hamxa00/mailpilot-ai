/**
 * @fileoverview Supabase integration for MailPilot AI
 * @description Supabase client configuration and real-time subscriptions
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger, logExternalService } from "../logging";
import { ExternalServiceError } from "../errors";
import type { SupabaseProvider } from "./types/supabase-types";

// Environment variables validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

// Client-side Supabase client (for authentication and real-time)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Server-side Supabase client (for admin operations)
export const supabaseServer = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

/**
 * Supabase provider implementation
 */
class SupabaseProviderImpl implements SupabaseProvider {
  public readonly client = supabase;
  public readonly serverClient: SupabaseClient;

  private subscriptions = new Map<string, () => void>();

  constructor() {
    if (!supabaseServer) {
      throw new Error(
        "Supabase service role key is required for server operations"
      );
    }
    this.serverClient = supabaseServer;
  }

  /**
   * Initialize real-time subscriptions
   */
  public async initializeRealtimeSubscriptions(): Promise<void> {
    try {
      logger.info("Initializing Supabase real-time subscriptions");

      // Initialize any global subscriptions here
      // Individual user subscriptions will be handled in subscribe methods

      logger.info("Supabase real-time subscriptions initialized");
    } catch (error) {
      logger.error("Failed to initialize Supabase subscriptions", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Subscribe to email updates for a specific user
   */
  public async subscribeToEmailUpdates(
    userId: string,
    callback: (payload: any) => void
  ): Promise<() => void> {
    const subscriptionKey = `email_updates_${userId}`;

    try {
      // Unsubscribe from existing subscription if any
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey)!();
      }

      // Subscribe to email table changes for this user
      const subscription = this.client
        .channel(`email_updates_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "email",
            filter: `account_id=in.(select id from account where user_id=eq.${userId})`,
          },
          callback
        )
        .subscribe();

      const unsubscribe = () => {
        subscription.unsubscribe();
        this.subscriptions.delete(subscriptionKey);
      };

      this.subscriptions.set(subscriptionKey, unsubscribe);

      logger.info("Email updates subscription created", { userId });

      return unsubscribe;
    } catch (error) {
      logger.error("Failed to subscribe to email updates", {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Subscribe to sync status updates for a specific user
   */
  public async subscribeToSyncUpdates(
    userId: string,
    callback: (payload: any) => void
  ): Promise<() => void> {
    const subscriptionKey = `sync_updates_${userId}`;

    try {
      // Unsubscribe from existing subscription if any
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey)!();
      }

      // Subscribe to account table changes for sync status
      const subscription = this.client
        .channel(`sync_updates_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "account",
            filter: `user_id=eq.${userId}`,
          },
          callback
        )
        .subscribe();

      const unsubscribe = () => {
        subscription.unsubscribe();
        this.subscriptions.delete(subscriptionKey);
      };

      this.subscriptions.set(subscriptionKey, unsubscribe);

      logger.info("Sync updates subscription created", { userId });

      return unsubscribe;
    } catch (error) {
      logger.error("Failed to subscribe to sync updates", {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get current user session
   */
  public async getSession(): Promise<any> {
    try {
      const { data: session, error } = await this.client.auth.getSession();

      if (error) {
        logger.error("Failed to get Supabase session", {
          error: error.message,
        });
        return null;
      }

      return session;
    } catch (error) {
      logger.error("Error getting Supabase session", {
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Sign out user
   */
  public async signOut(): Promise<void> {
    try {
      // Clean up all subscriptions
      for (const unsubscribe of this.subscriptions.values()) {
        unsubscribe();
      }
      this.subscriptions.clear();

      const { error } = await this.client.auth.signOut();

      if (error) {
        logger.error("Failed to sign out from Supabase", {
          error: error.message,
        });
        throw error;
      }

      logger.info("User signed out from Supabase");
    } catch (error) {
      logger.error("Error signing out from Supabase", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseProvider = new SupabaseProviderImpl();

/**
 * Helper functions for common Supabase operations
 */

/**
 * Get user profile from Supabase Auth
 */
export const getUserProfile = async (userId?: string) => {
  try {
    const client = userId && supabaseServer ? supabaseServer : supabase;
    const { data: user, error } = await client.auth.getUser();

    if (error) {
      logger.error("Failed to get user profile", {
        error: error.message,
        userId,
      });
      return null;
    }

    return user;
  } catch (error) {
    logger.error("Error getting user profile", {
      error: error instanceof Error ? error.message : error,
      userId,
    });
    return null;
  }
};

/**
 * Update user metadata in Supabase Auth
 */
export const updateUserMetadata = async (metadata: Record<string, any>) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      logger.error("Failed to update user metadata", {
        error: error.message,
        metadata,
      });
      throw error;
    }

    logger.info("User metadata updated", { metadata });
    return data;
  } catch (error) {
    logger.error("Error updating user metadata", {
      error: error instanceof Error ? error.message : error,
      metadata,
    });
    throw error;
  }
};

/**
 * Check if user has specific role or permission
 */
export const checkUserPermission = async (
  userId: string,
  permission: string
): Promise<boolean> => {
  try {
    if (!supabaseServer) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "supabase",
        message: "Supabase server client is not available",
        context: { operation: "checkUserPermission" },
      });
    }

    // This would query your user roles/permissions table
    const { data, error } = await supabaseServer
      .from("user_permissions")
      .select("permission")
      .eq("user_id", userId)
      .eq("permission", permission)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      logger.error("Failed to check user permission", {
        error: error.message,
        userId,
        permission,
      });
      return false;
    }

    return !!data;
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    logger.error("Error checking user permission", {
      error: error instanceof Error ? error.message : error,
      userId,
      permission,
    });
    return false;
  }
};

/**
 * Log user activity to Supabase
 */
export const logUserActivity = async (
  userId: string,
  activity: string,
  metadata?: Record<string, any>
) => {
  try {
    if (!supabaseServer) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "supabase",
        message: "Supabase server client is not available",
        context: {
          operation: "logUserActivity",
        },
      });
    }

    const { error } = await supabaseServer.from("user_activity_logs").insert({
      user_id: userId,
      activity,
      metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error("Failed to log user activity", {
        error: error.message,
        userId,
        activity,
      });
    }
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    logger.error("Error logging user activity", {
      error: error instanceof Error ? error.message : error,
      userId,
      activity,
    });
  }
};
