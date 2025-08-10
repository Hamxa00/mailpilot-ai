/**
 * @fileoverview Supabase webhook types and interfaces
 * @description Type definitions for handling Supabase Auth webhooks
 * @author MailPilot AI Team
 * @version 1.0.0
 */

/**
 * Supabase Auth webhook event types
 */
export type SupabaseAuthEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.signed_in"
  | "user.signed_out";

/**
 * Supabase Auth webhook payload
 */
export interface SupabaseAuthWebhookPayload {
  type: SupabaseAuthEventType;
  table: "auth.users";
  record: SupabaseAuthUser;
  schema: "auth";
  old_record?: SupabaseAuthUser | null;
}

/**
 * Supabase Auth user structure from webhook
 */
export interface SupabaseAuthUser {
  id: string;
  aud: string;
  role: string;
  email: string;
  email_confirmed_at: string | null;
  phone: string | null;
  phone_confirmed_at: string | null;
  confirmation_sent_at: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  app_metadata: {
    provider: string;
    providers: string[];
    [key: string]: any;
  };
  user_metadata: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    sub?: string;
    [key: string]: any;
  };
  identities: Array<{
    identity_id: string;
    id: string;
    user_id: string;
    identity_data: Record<string, any>;
    provider: string;
    last_sign_in_at: string;
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
  is_anonymous?: boolean;
}

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * User sync data for database operations
 */
export interface UserSyncData {
  id: string;
  emailAddress: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
}
