/**
 * @fileoverview Authentication validation schemas for MailPilot AI
 * @description Supabase-compatible authentication schemas
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { z } from "zod";
import { stringValidations } from "./common-schemas";

/**
 * User registration schema (Supabase compatible)
 */
export const supabaseRegistrationSchema = z
  .object({
    /** User's email address */
    email: stringValidations.email,

    /** User's password */
    password: stringValidations.password,

    /** Password confirmation */
    confirmPassword: z.string(),

    /** User's first name */
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name is too long")
      .regex(/^[a-zA-Z\s\-'\.]+$/, "Invalid characters in first name"),

    /** User's last name */
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name is too long")
      .regex(/^[a-zA-Z\s\-'\.]+$/, "Invalid characters in last name"),

    /** Terms of service acceptance */
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms of service",
    }),

    /** Marketing emails consent */
    acceptMarketing: z.boolean().optional().default(false),

    /** Referral code */
    referralCode: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{6,12}$/, "Invalid referral code format")
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * User login schema (Supabase compatible)
 */
export const supabaseLoginSchema = z.object({
  /** User's email address */
  email: stringValidations.email,

  /** User's password */
  password: z.string().min(1, "Password is required"),

  /** Remember me flag */
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Google OAuth callback schema
 */
export const googleOAuthSchema = z.object({
  /** OAuth code from Google */
  code: z.string().min(1, "OAuth code is required"),

  /** State parameter for CSRF protection */
  state: z.string().optional(),

  /** Redirect URI */
  redirectUri: z.string().url().optional(),
});

/**
 * OAuth provider schema
 */
export const oauthProviderSchema = z.object({
  /** OAuth provider */
  provider: z.enum(["google", "github", "microsoft", "apple"]),

  /** Redirect URL after OAuth */
  redirectTo: z.string().url().optional(),

  /** Additional scopes */
  scopes: z.string().optional(),
});

/**
 * Password reset request schema (Supabase)
 */
export const supabasePasswordResetSchema = z.object({
  /** User's email address */
  email: stringValidations.email,

  /** Redirect URL after reset */
  redirectTo: z.string().url().optional(),
});

/**
 * Password update schema (Supabase)
 */
export const supabasePasswordUpdateSchema = z
  .object({
    /** New password */
    password: stringValidations.password,

    /** Password confirmation */
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  /** Verification token */
  token: z.string().min(1, "Verification token is required"),

  /** Email to verify */
  email: stringValidations.email.optional(),
});

/**
 * Session refresh schema
 */
export const sessionRefreshSchema = z.object({
  /** Refresh token */
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Magic link request schema
 */
export const magicLinkSchema = z.object({
  /** User's email address */
  email: stringValidations.email,

  /** Redirect URL after magic link login */
  redirectTo: z.string().url().optional(),

  /** Should create user if not exists */
  shouldCreateUser: z.boolean().optional().default(true),
});

/**
 * User metadata update schema (for Supabase user metadata)
 */
export const userMetadataSchema = z.object({
  /** First name */
  firstName: z.string().trim().min(1).max(50).optional(),

  /** Last name */
  lastName: z.string().trim().min(1).max(50).optional(),

  /** Display name */
  displayName: z.string().trim().min(1).max(100).optional(),

  /** Avatar URL */
  avatarUrl: z.string().url().optional(),

  /** Phone number */
  phone: stringValidations.phone.optional(),

  /** Timezone */
  timezone: z.string().optional(),

  /** Language preference */
  language: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional(),

  /** Marketing consent */
  acceptMarketing: z.boolean().optional(),
});

/**
 * Auth state schema for client-side
 */
export const authStateSchema = z.object({
  /** User object */
  user: z
    .object({
      id: z.string(),
      email: z.string().email(),
      emailVerified: z.boolean(),
      createdAt: z.string(),
      lastSignInAt: z.string().optional(),
      userMetadata: userMetadataSchema.optional(),
      appMetadata: z.record(z.unknown()).optional(),
    })
    .nullable(),

  /** Session object */
  session: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.number(),
      user: z.object({
        id: z.string(),
        email: z.string(),
      }),
    })
    .nullable(),
});

/**
 * Export all schemas for backwards compatibility and organization
 */
export const authSchemas = {
  registration: supabaseRegistrationSchema,
  login: supabaseLoginSchema,
  googleOAuth: googleOAuthSchema,
  oauthProvider: oauthProviderSchema,
  passwordReset: supabasePasswordResetSchema,
  passwordUpdate: supabasePasswordUpdateSchema,
  emailVerification: emailVerificationSchema,
  sessionRefresh: sessionRefreshSchema,
  magicLink: magicLinkSchema,
  userMetadata: userMetadataSchema,
  authState: authStateSchema,
} as const;
