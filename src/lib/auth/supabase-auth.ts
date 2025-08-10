/**
 * @fileoverview Supabase authentication utilities for MailPilot AI
 * @description Centralized authentication utilities using Supabase
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import {
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { logger } from "../logging";
import { AppError, AuthenticationError, AuthorizationError } from "../errors";
import { generateSecureToken } from "../security";

/**
 * Database types for better TypeScript support
 */
export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          id: string;
          email_address: string;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
          role: "user" | "admin" | "moderator" | null;
          is_active: boolean | null;
          email_verified: boolean | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email_address: string;
          first_name?: string | null;
          last_name?: string | null;
          image_url?: string | null;
          role?: "user" | "admin" | "moderator" | null;
          is_active?: boolean | null;
          email_verified?: boolean | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email_address?: string;
          first_name?: string | null;
          last_name?: string | null;
          image_url?: string | null;
          role?: "user" | "admin" | "moderator" | null;
          is_active?: boolean | null;
          email_verified?: boolean | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

/**
 * Extended user type with our database fields
 */
export interface ExtendedUser extends User {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role?: "user" | "admin" | "moderator";
  isActive?: boolean;
  lastLoginAt?: string;
}

/**
 * Authentication response interface
 */
export interface AuthResponse<T = any> {
  user?: ExtendedUser | null;
  session?: Session | null;
  data?: T;
  error?: AuthError | AppError | null;
}

/**
 * Create Supabase client for server components
 */
export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies });
};

/**
 * Create Supabase client for client components
 */
export const createClientSupabaseClient = () => {
  return createClientComponentClient<Database>();
};

/**
 * Create Supabase client for API routes
 */
export const createApiSupabaseClient = async (request: NextRequest) => {
    return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
      },
    }
  );
};

/**
 * Get current user from session or Bearer token
 */
export const getCurrentUser = async (
  request?: NextRequest
): Promise<ExtendedUser | null> => {
  try {
    let supabase;
    let user = null;

    if (request) {
      // For API routes, try to get user from Bearer token first
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      if (bearerToken) {
        // Create Supabase client and verify the JWT token directly
        supabase = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        try {
          const { data, error } = await supabase.auth.getUser(bearerToken);
          if (error) {
            logger.warn("Failed to verify Bearer token", {
              error: error.message,
            });
          } else {
            user = data.user;
          }
        } catch (tokenError) {
          logger.warn("Error verifying Bearer token", {
            error:
              tokenError instanceof Error ? tokenError.message : tokenError,
          });
        }
      }

      // Fallback to regular API client if no Bearer token or token failed
      if (!user) {
        supabase = await createApiSupabaseClient(request);
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          logger.warn("Failed to get current user from cookies", {
            error: error.message,
          });
        } else {
          user = data.user;
        }
      }
    } else {
      // For server components, use the regular client
      supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        logger.warn("Failed to get current user", { error: error.message });
        return null;
      }
      user = data.user;
    }

    if (!user) {
      return null;
    }

    // Ensure we have a supabase client for database queries
    if (!supabase) {
      supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }

    // Fetch additional user data from our database
    const { data: userData, error: dbError } = await supabase
      .from("user")
      .select("*")
      .eq("email_address", user.email!)
      .single();

    if (dbError && dbError.code !== "PGRST116") {
      // Not found error
      logger.error("Failed to fetch user data from database", {
        userId: user.id,
        error: dbError.message,
      });
    }

    // Merge Supabase user with our database user
    const extendedUser: ExtendedUser = {
      ...user,
      firstName: userData?.first_name || user.user_metadata?.firstName,
      lastName: userData?.last_name || user.user_metadata?.lastName,
      displayName:
        userData?.first_name && userData?.last_name
          ? `${userData.first_name} ${userData.last_name}`
          : user.user_metadata?.displayName,
      role: userData?.role || "user",
      isActive: userData?.is_active ?? true,
      lastLoginAt: userData?.last_login_at,
    };

    return extendedUser;
  } catch (error) {
    logger.error("Unexpected error getting current user", { error });
    return null;
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async (
  request?: NextRequest
): Promise<Session | null> => {
  try {
    const supabase = request
      ? await createApiSupabaseClient(request)
      : createServerSupabaseClient();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logger.warn("Failed to get current session", { error: error.message });
      return null;
    }

    return session;
  } catch (error) {
    logger.error("Unexpected error getting current session", { error });
    return null;
  }
};

/**
 * Require authentication middleware
 */
export const requireAuth = async (
  request: NextRequest
): Promise<ExtendedUser> => {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new AuthenticationError("AUTH_REQUIRED");
  }

  if (!user.isActive) {
    throw new AuthorizationError("AUTHZ_ACCOUNT_ACCESS_DENIED");
  }

  return user;
};

/**
 * Require specific roles
 */
export const requireRole = async (
  request: NextRequest,
  requiredRoles: Array<"user" | "admin" | "moderator">
): Promise<ExtendedUser> => {
  const user = await requireAuth(request);

  if (!requiredRoles.includes(user.role || "user")) {
    throw new AuthorizationError("AUTHZ_INSUFFICIENT_PERMISSIONS");
  }

  return user;
};

/**
 * Sign up new user
 */
export const signUpUser = async (
  email: string,
  password: string,
  metadata: {
    firstName: string;
    lastName: string;
    acceptTerms: boolean;
    acceptMarketing?: boolean;
    referralCode?: string;
  },
  request?: NextRequest
): Promise<AuthResponse> => {
  try {
    const supabase = request
      ? await createApiSupabaseClient(request)
      : createClientSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName: metadata.firstName,
          lastName: metadata.lastName,
          displayName: `${metadata.firstName} ${metadata.lastName}`,
          acceptTerms: metadata.acceptTerms,
          acceptMarketing: metadata.acceptMarketing || false,
          referralCode: metadata.referralCode,
        },
      },
    });

    if (error) {
      logger.error("User sign up failed", { email, error: error.message });
      return { error };
    }

    // Create user record in our database
    if (data.user) {
      logger.info("Creating user record in database", {
        userId: data.user.id,
        email: email,
      });

      const { data: insertData, error: dbError } = await supabase
        .from("user")
        .insert({
          id: data.user.id,
          email_address: email,
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          email_verified: data.user.email_confirmed_at != null,
        })
        .select();

      if (dbError) {
        logger.error("Failed to create user record", {
          userId: data.user.id,
          email: email,
          error: dbError.message,
          errorDetails: dbError,
        });
        // Don't fail the registration if database insert fails
      } else {
        logger.info("User record created successfully", {
          userId: data.user.id,
          insertedData: insertData,
        });
      }
    }

    logger.info("User signed up successfully", {
      email,
      userId: data.user?.id,
      needsConfirmation: !data.session,
    });

    return { user: data.user as ExtendedUser, session: data.session };
  } catch (error) {
    logger.error("Unexpected error during sign up", { email, error });
    return { error: new AppError("BL_REGISTRATION_FAILED") };
  }
};

/**
 * Sign in user
 */
export const signInUser = async (
  email: string,
  password: string,
  request?: NextRequest
): Promise<AuthResponse> => {
  try {
    const supabase = request
      ? await createApiSupabaseClient(request)
      : createClientSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error("User sign in failed", { email, error: error.message });
      return { error };
    }

    // Update user metadata with current login time
    if (data.user) {
      // Update last login time in our database (primary method)
      try {
        // Import database utilities (move to top if needed)
        const { getDatabase, initializeDatabase, getDatabaseStatus } =
          await import("../database");
        const { user } = await import("../../db/schema");
        const { eq } = await import("drizzle-orm");

        // Ensure database is initialized
        try {
          const status = getDatabaseStatus();
          if (!status.connected) {
            logger.info(
              "Database not connected, initializing for login sync..."
            );
            await initializeDatabase();
          }
        } catch (initError) {
          logger.warn("Failed to initialize database for login sync", {
            error: initError instanceof Error ? initError.message : initError,
          });
        }

        const db = getDatabase();
        await db
          .update(user)
          .set({ lastLoginAt: new Date() })
          .where(eq(user.emailAddress, email));

        logger.info("Updated last login time in database", {
          userId: data.user.id,
          email,
        });
      } catch (dbUpdateError) {
        logger.warn("Error updating database login time", {
          userId: data.user.id,
          error:
            dbUpdateError instanceof Error
              ? dbUpdateError.message
              : dbUpdateError,
        });
      }
    }

    logger.info("User signed in successfully", {
      email,
      userId: data.user?.id,
    });

    return { user: data.user as ExtendedUser, session: data.session };
  } catch (error) {
    logger.error("Unexpected error during sign in", { email, error });
    return { error: new AppError("BL_LOGIN_FAILED") };
  }
};

/**
 * Sign in with OAuth provider
 */
export const signInWithOAuth = async (
  provider: "google" | "github" | "azure",
  redirectTo?: string
): Promise<AuthResponse<{ url: string }>> => {
  try {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      logger.error(`OAuth sign in failed`, { provider, error: error.message });
      return { error };
    }

    logger.info("OAuth sign in initiated", { provider, url: data.url });

    return { data: { url: data.url } };
  } catch (error) {
    logger.error("Unexpected error during OAuth sign in", { provider, error });
    return { error: new AppError("EXT_SERVICE_UNAVAILABLE") };
  }
};

/**
 * Sign out user
 */
export const signOutUser = async (
  request?: NextRequest
): Promise<AuthResponse> => {
  try {
    let supabase;

    if (request) {
      // For server-side API routes, use createClient with awaited cookies
            supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            flowType: "pkce",
          },
        }
      );
    } else {
      // For client-side usage
      supabase = createClientSupabaseClient();
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error("User sign out failed", { error: error.message });
      return { error };
    }

    logger.info("User signed out successfully");
    return {};
  } catch (error) {
    logger.error("Unexpected error during sign out", { error });
    return { error: new AppError("SYS_INTERNAL_ERROR") };
  }
};

/**
 * Reset password
 */
export const resetPassword = async (
  email: string,
  redirectTo?: string
): Promise<AuthResponse> => {
  try {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      logger.error("Password reset request failed", {
        email,
        error: error.message,
      });
      return { error };
    }

    logger.info("Password reset email sent", { email });
    return {};
  } catch (error) {
    logger.error("Unexpected error during password reset", { email, error });
    return { error: new AppError("SYS_INTERNAL_ERROR") };
  }
};

/**
 * Update password
 */
export const updatePassword = async (
  newPassword: string
): Promise<AuthResponse> => {
  try {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      logger.error("Password update failed", { error: error.message });
      return { error };
    }

    logger.info("Password updated successfully", { userId: data.user?.id });
    return { user: data.user as ExtendedUser };
  } catch (error) {
    logger.error("Unexpected error during password update", { error });
    return { error: new AppError("SYS_INTERNAL_ERROR") };
  }
};

/**
 * Update user metadata
 */
export const updateUserMetadata = async (
  metadata: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    avatarUrl: string;
    phone: string;
  }>,
  authHeader?: string
): Promise<AuthResponse> => {
  try {
    // If we have a Bearer token, use it directly
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");

      // Create Supabase client and verify the JWT token directly
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Verify the JWT token
      const { data: jwtData, error: jwtError } = await supabase.auth.getUser(
        token
      );

      if (jwtError || !jwtData.user) {
        logger.error("Invalid token for user update", {
          error: jwtError?.message,
        });
        return { error: new AppError("AUTH_INVALID_TOKEN") };
      }

      const userId = jwtData.user.id;

      // Use service role key for admin operations
      const adminSupabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Update user metadata using admin client
      const { data, error } = await adminSupabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: metadata,
        }
      );

      if (error) {
        logger.error("User metadata update failed via API", {
          error: error.message,
        });
        return { error };
      }

      // Also update our database using the admin client
      const { error: dbError } = await adminSupabase
        .from("user")
        .update({
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          image_url: metadata.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (dbError) {
        logger.warn("Failed to update user in database via API", {
          userId,
          error: dbError.message,
        });
      }

      logger.info("User metadata updated successfully via API", { userId });
      return { user: data.user as ExtendedUser };
    } else {
      // Use client-side Supabase client for browser requests
      const supabase = createClientSupabaseClient();

      const { data, error } = await supabase.auth.updateUser({
        data: metadata,
      });

      if (error) {
        logger.error("User metadata update failed", { error: error.message });
        return { error };
      }

      // Also update our database
      const { error: dbError } = await supabase
        .from("user")
        .update({
          first_name: metadata.firstName,
          last_name: metadata.lastName,
          image_url: metadata.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);

      if (dbError) {
        logger.warn("Failed to update user in database", {
          userId: data.user.id,
          error: dbError.message,
        });
      }

      logger.info("User metadata updated successfully", {
        userId: data.user.id,
      });
      return { user: data.user as ExtendedUser };
    }
  } catch (error) {
    logger.error("Unexpected error during metadata update", { error });
    return { error: new AppError("SYS_INTERNAL_ERROR") };
  }
};

/**
 * Resend email confirmation
 */
export const resendConfirmation = async (
  email: string
): Promise<AuthResponse> => {
  try {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      logger.error("Email confirmation resend failed", {
        email,
        error: error.message,
      });
      return { error };
    }

    logger.info("Email confirmation resent", { email });
    return {};
  } catch (error) {
    logger.error("Unexpected error during email confirmation resend", {
      email,
      error,
    });
    return { error: new AppError("SYS_INTERNAL_ERROR") };
  }
};

/**
 * Validate and refresh session
 */
export const refreshSession = async (
  refreshToken?: string
): Promise<AuthResponse> => {
  try {
    if (refreshToken) {
      // Use the provided refresh token with a basic Supabase client
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.error("Session refresh failed with token", {
          error: error.message,
        });
        return { error };
      }

      logger.debug("Session refreshed successfully with token", {
        userId: data.user?.id,
      });
      return { user: data.user as ExtendedUser, session: data.session };
    } else {
      // Use cookies for client-side refresh
      const supabase = createClientSupabaseClient();
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error("Client session refresh failed", { error: error.message });
        return { error };
      }

      logger.debug("Client session refreshed successfully", {
        userId: data.user?.id,
      });
      return { user: data.user as ExtendedUser, session: data.session };
    }
  } catch (error) {
    logger.error("Unexpected error during session refresh", { error });
    return { error: new AppError("SYS_INTERNAL_ERROR") };
  }
};
