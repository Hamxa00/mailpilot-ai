/**
 * @fileoverview OAuth callback handler
 * @description Handles OAuth callback from providers like Google
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logging";
import { ensureUserInDatabase } from "@/lib/auth";
import type { Database } from "@/lib/auth";
import { env } from "@/lib/config";

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

export const GET = async (request: NextRequest) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error) {
    logger.warn("OAuth callback error", {
      error,
      errorDescription,
    });

    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (code) {
    const supabase = await createSupabaseClient();

    try {
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        logger.error("OAuth code exchange failed", {
          error: exchangeError.message,
        });

        return NextResponse.redirect(
          new URL("/auth/login?error=oauth_exchange_failed", request.url)
        );
      }

      if (data.user) {
        logger.info("OAuth login successful", {
          userId: data.user.id,
          email: data.user.email,
          provider: data.user.app_metadata.provider,
        });

        // Ensure user exists in our database using the new sync system
        const syncResult = await ensureUserInDatabase(data.user.id);

        if (!syncResult.success) {
          logger.error("Failed to sync OAuth user to database", {
            userId: data.user.id,
            error: syncResult.error,
          });
          // Continue anyway - user can still use the app with Supabase Auth
        } else {
          logger.info("OAuth user synced to database", {
            userId: data.user.id,
            created: syncResult.created,
          });
        }
      }

      // Redirect to dashboard on success
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (err) {
      logger.error("Unexpected error in OAuth callback", { error: err });

      return NextResponse.redirect(
        new URL("/auth/login?error=unexpected_error", request.url)
      );
    }
  }

  // No code parameter, redirect to login
  logger.warn("OAuth callback called without code parameter");
  return NextResponse.redirect(
    new URL("/auth/login?error=missing_code", request.url)
  );
};
