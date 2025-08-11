/**
 * @fileoverview Environment configuration for MailPilot AI
 * @description Centralized environment variable management
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { z } from "zod";

/**
 * Environment schema validation
 */
const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Supabase service role key is required"),
  SUPABASE_WEBHOOK_SECRET: z
    .string()
    .min(32, "Supabase webhook secret must be at least 32 characters")
    .optional(),

  // Database
  DATABASE_URL: z.string().url("Invalid database URL"),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid app URL"),
  NEXT_PUBLIC_APP_NAME: z.string().default("MailPilot AI"),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  NEXTAUTH_SECRET: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "Google Client ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "Google Client Secret is required"),

  // External Services
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional().or(z.literal("")),
  STRIPE_SECRET_KEY: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
});

// Safe environment access with build-time fallbacks
let _cachedEnv: any = null;

/**
 * Get environment variables with safe fallbacks during build
 */
function getSafeEnv() {
  if (_cachedEnv) return _cachedEnv;

  // Always provide fallbacks during server-side rendering/build
  const fallbacks = {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key",
    SUPABASE_WEBHOOK_SECRET: process.env.SUPABASE_WEBHOOK_SECRET,
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "https://placeholder.com",
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "MailPilot AI",
    JWT_SECRET:
      process.env.JWT_SECRET || "placeholder-jwt-secret-32-chars-minimum",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
    GOOGLE_CLIENT_SECRET:
      process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
    NODE_ENV:
      (process.env.NODE_ENV as "development" | "production" | "test") ||
      "development",
    VERCEL_ENV: process.env.VERCEL_ENV as
      | "development"
      | "preview"
      | "production"
      | undefined,
  };

  // Only validate in runtime environments with proper env vars
  if (process.env.VERCEL_URL || process.env.NODE_ENV === "development") {
    try {
      _cachedEnv = envSchema.parse(process.env);
      return _cachedEnv;
    } catch (error) {
      console.warn("Environment validation failed, using fallbacks:", error);
    }
  }

  _cachedEnv = fallbacks;
  return _cachedEnv;
}

/**
 * Validated environment variables
 */
export const env = getSafeEnv();

/**
 * Supabase configuration
 */
export const supabaseConfig = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

/**
 * App configuration
 */
export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  url: env.NEXT_PUBLIC_APP_URL,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
} as const;

/**
 * Authentication configuration
 */
export const authConfig = {
  jwtSecret: env.JWT_SECRET,
  sessionDuration: 7 * 24 * 60 * 60, // 7 days in seconds
  refreshTokenDuration: 30 * 24 * 60 * 60, // 30 days in seconds
  providers: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
} as const;

/**
 * Database configuration
 */
export const databaseConfig = {
  url: env.DATABASE_URL,
} as const;

/**
 * External services configuration
 */
export const servicesConfig = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY,
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
} as const;

/**
 * Check if running in a secure context
 */
export const isSecureContext = () => {
  return (
    appConfig.isProd || (appConfig.url && appConfig.url.startsWith("https://"))
  );
};

/**
 * Get redirect URLs for OAuth
 */
export const getAuthRedirectUrls = () => {
  const baseUrl = appConfig.url;

  return {
    signIn: `${baseUrl}/auth/callback`,
    signUp: `${baseUrl}/auth/callback`,
    resetPassword: `${baseUrl}/auth/reset-password`,
    emailConfirm: `${baseUrl}/auth/confirm`,
  };
};

/**
 * Validation helpers
 */
export const validateRequiredEnvVar = (
  name: string,
  value?: string
): string => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Please add this to your .env.local file.`
    );
  }
  return value;
};

/**
 * Get environment info for debugging
 */
export const getEnvInfo = () => {
  return {
    nodeEnv: env.NODE_ENV,
    vercelEnv: env.VERCEL_ENV,
    hasSupabase: !!(
      env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    hasDatabase: !!env.DATABASE_URL,
    hasGoogleOAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    hasOpenAI: !!env.OPENAI_API_KEY,
    hasGemini: !!env.GEMINI_API_KEY,
    hasStripe: !!(
      env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),
  };
};
