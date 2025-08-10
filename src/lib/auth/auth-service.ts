/**
 * @fileoverview Authentication service for user management
 * @description Centralized authentication service with user registration, OAuth, and database sync
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { Database } from "./supabase-auth";
import { logger } from "../logging";
import {
  createUser,
  updateUser,
  transformSupabaseUser,
  userExists,
} from "../webhooks";
import { env } from "../config";

/**
 * Create a Supabase client that handles Next.js 15 async cookies
 */
async function createSupabaseClient() {
  const cookieStore = await cookies();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: "pkce",
      },
    }
  );
}

/**
 * Registration data interface
 */
export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  acceptMarketing?: boolean;
  referralCode?: string;
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
    createdAt: string;
  };
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  } | null;
  needsVerification?: boolean;
  message: string;
  error?: string;
  errorCode?: string;
}

/**
 * Check if user exists in our database by email
 */
export async function checkUserExistsByEmail(email: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseClient();

    const { data } = await supabase
      .from("user")
      .select("id")
      .eq("email_address", email)
      .single();

    return !!data;
  } catch (error) {
    logger.error("Error checking user existence", {
      email,
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
}

/**
 * Register a new user with Supabase Auth and sync to database
 */
export async function registerUser(
  registrationData: RegistrationData,
  requestId?: string
): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseClient();

    logger.info("Starting user registration", {
      requestId,
      email: registrationData.email,
      referralCode: registrationData.referralCode,
    });

    // Check if user already exists in our database
    const userExists = await checkUserExistsByEmail(registrationData.email);

    if (userExists) {
      logger.warn("Registration attempt with existing email", {
        requestId,
        email: registrationData.email,
      });

      return {
        success: false,
        message: "An account with this email already exists",
        errorCode: "USER_ALREADY_EXISTS",
      };
    }

    // Sign up user with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          first_name: registrationData.firstName,
          last_name: registrationData.lastName,
          full_name: `${registrationData.firstName} ${registrationData.lastName}`,
          accept_terms: registrationData.acceptTerms,
          accept_marketing: registrationData.acceptMarketing || false,
          referral_code: registrationData.referralCode || null,
          registration_source: "api",
        },
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (signUpError) {
      logger.error("Supabase registration failed", {
        requestId,
        email: registrationData.email,
        error: signUpError.message,
        code: signUpError.status,
      });

      // Handle specific Supabase errors
      if (signUpError.message.includes("already registered")) {
        return {
          success: false,
          message: "An account with this email already exists",
          errorCode: "USER_ALREADY_EXISTS",
        };
      }

      if (signUpError.message.includes("Password")) {
        return {
          success: false,
          message: "Password does not meet requirements",
          errorCode: "INVALID_PASSWORD",
        };
      }

      return {
        success: false,
        message: "Registration failed. Please try again.",
        error: signUpError.message,
        errorCode: "REGISTRATION_FAILED",
      };
    }

    if (!data.user) {
      logger.error("Registration successful but no user data returned", {
        requestId,
        email: registrationData.email,
      });

      return {
        success: false,
        message: "Registration failed unexpectedly",
        errorCode: "NO_USER_DATA",
      };
    }

    logger.info("Supabase user created successfully", {
      requestId,
      userId: data.user.id,
      email: data.user.email,
      needsConfirmation: !data.user.email_confirmed_at,
    });

    // Immediate database sync (fallback for webhook)
    const syncResult = await syncUserToDatabase(
      data.user,
      registrationData.firstName,
      registrationData.lastName
    );

    if (!syncResult.success) {
      logger.warn("Failed to sync user to database immediately", {
        requestId,
        userId: data.user.id,
        error: syncResult.error,
      });
      // Don't fail the registration if database sync fails
      // The webhook will handle it later
    } else {
      logger.info("User synced to database successfully", {
        requestId,
        userId: data.user.id,
      });
    }

    const needsVerification = !data.user.email_confirmed_at;

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        emailVerified: !!data.user.email_confirmed_at,
        createdAt: data.user.created_at,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
          }
        : null,
      needsVerification,
      message: needsVerification
        ? "Registration successful! Please check your email to verify your account."
        : "Registration successful! You can now sign in.",
    };
  } catch (error) {
    logger.error("Unexpected error during registration", {
      requestId,
      email: registrationData.email,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      message: "Registration failed due to server error",
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INTERNAL_ERROR",
    };
  }
}

/**
 * Sync Supabase Auth user to our database
 */
async function syncUserToDatabase(
  supabaseUser: any,
  firstName?: string,
  lastName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userData = transformSupabaseUser({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      email_confirmed_at: supabaseUser.email_confirmed_at,
      phone: supabaseUser.phone,
      phone_confirmed_at: supabaseUser.phone_confirmed_at,
      confirmation_sent_at: null,
      confirmed_at: supabaseUser.confirmed_at,
      last_sign_in_at: supabaseUser.last_sign_in_at,
      app_metadata: supabaseUser.app_metadata as any,
      user_metadata: {
        ...supabaseUser.user_metadata,
        // Override with provided names if available
        first_name: firstName || supabaseUser.user_metadata?.first_name,
        last_name: lastName || supabaseUser.user_metadata?.last_name,
      },
      identities: supabaseUser.identities as any,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at,
      is_anonymous: false,
      aud: supabaseUser.aud,
      role: supabaseUser.role,
    });

    const syncResult = await createUser(userData);
    return syncResult;
  } catch (syncError) {
    logger.error("Error during database sync", {
      userId: supabaseUser.id,
      error: syncError instanceof Error ? syncError.message : syncError,
    });

    return {
      success: false,
      error:
        syncError instanceof Error ? syncError.message : "Unknown sync error",
    };
  }
}

/**
 * Ensure user exists in our database (for OAuth users)
 */
export async function ensureUserInDatabase(
  supabaseUserId: string
): Promise<{ success: boolean; created?: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseClient();

    // Check if user exists in our database
    const exists = await userExists(supabaseUserId);

    if (exists) {
      logger.debug("User already exists in database", {
        userId: supabaseUserId,
      });
      return { success: true, created: false };
    }

    // Get user data from Supabase Auth
    const { data: authUser, error } = await supabase.auth.admin.getUserById(
      supabaseUserId
    );

    if (error || !authUser.user) {
      logger.error("Failed to get user from Supabase Auth", {
        userId: supabaseUserId,
        error: error?.message,
      });
      return { success: false, error: "Failed to fetch user data" };
    }

    // Sync user to database
    const result = await syncUserToDatabase(authUser.user);

    return {
      success: result.success,
      created: true,
      error: result.error,
    };
  } catch (error) {
    logger.error("Error ensuring user in database", {
      userId: supabaseUserId,
      error: error instanceof Error ? error.message : error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
