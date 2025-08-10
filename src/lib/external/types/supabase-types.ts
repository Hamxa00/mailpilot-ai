/**
 * @fileoverview Supabase service type definitions
 * @description Type definitions for Supabase integration
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase provider interface
 */
export interface SupabaseProvider {
  /** Client-side Supabase client */
  client: SupabaseClient;

  /** Server-side Supabase client */
  serverClient: SupabaseClient;

  /**
   * Initialize real-time subscriptions
   */
  initializeRealtimeSubscriptions(): Promise<void>;

  /**
   * Subscribe to email updates
   */
  subscribeToEmailUpdates(
    userId: string,
    callback: (payload: unknown) => void
  ): Promise<() => void>;

  /**
   * Subscribe to sync status updates
   */
  subscribeToSyncUpdates(
    userId: string,
    callback: (payload: unknown) => void
  ): Promise<() => void>;

  /**
   * Get user session
   */
  getSession(): Promise<any>;

  /**
   * Sign out user
   */
  signOut(): Promise<void>;
}
