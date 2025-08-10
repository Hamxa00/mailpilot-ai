/**
 * @fileoverview User validation schemas for MailPilot AI
 * @description User-related validation schemas for authentication, profiles, and preferences
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { z } from "zod";
import {
  stringValidations,
  numberValidations,
  dateValidations,
} from "./common-schemas";

/**
 * User registration schema
 */
export const userRegistrationSchema = z
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
 * User login schema
 */
export const userLoginSchema = z.object({
  /** User's email address */
  email: stringValidations.email,

  /** User's password */
  password: z.string().min(1, "Password is required"),

  /** Remember me flag */
  rememberMe: z.boolean().optional().default(false),

  /** Two-factor authentication code */
  totpCode: z
    .string()
    .regex(/^\d{6}$/, "TOTP code must be 6 digits")
    .optional(),
});

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  /** User's email address */
  email: stringValidations.email,

  /** Callback URL after reset */
  callbackUrl: stringValidations.url.optional(),
});

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z
  .object({
    /** Reset token */
    token: z.string().min(1, "Reset token is required"),

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
 * User profile update schema
 */
export const userProfileUpdateSchema = z.object({
  /** User's first name */
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name is too long")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Invalid characters in first name")
    .optional(),

  /** User's last name */
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name is too long")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Invalid characters in last name")
    .optional(),

  /** Display name */
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name is too long")
    .optional(),

  /** Profile bio */
  bio: z.string().trim().max(500, "Bio is too long").optional(),

  /** Profile avatar URL */
  avatarUrl: stringValidations.url.optional(),

  /** User's timezone */
  timezone: z
    .string()
    .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, "Invalid timezone format")
    .optional(),

  /** User's language preference */
  language: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid language code")
    .optional(),

  /** Phone number */
  phone: stringValidations.phone.optional(),

  /** Company name */
  company: z.string().trim().max(100, "Company name is too long").optional(),

  /** Job title */
  jobTitle: z.string().trim().max(100, "Job title is too long").optional(),

  /** Website URL */
  website: stringValidations.url.optional(),
});

/**
 * Email change request schema
 */
export const emailChangeRequestSchema = z.object({
  /** New email address */
  newEmail: stringValidations.email,

  /** Current password for verification */
  currentPassword: z.string().min(1, "Current password is required"),
});

/**
 * Password change schema
 */
export const passwordChangeSchema = z
  .object({
    /** Current password */
    currentPassword: z.string().min(1, "Current password is required"),

    /** New password */
    newPassword: stringValidations.password,

    /** New password confirmation */
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

/**
 * Two-factor authentication setup schema
 */
export const twoFactorSetupSchema = z.object({
  /** TOTP code for verification */
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),

  /** Backup codes acknowledgment */
  backupCodesAcknowledged: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the backup codes",
  }),
});

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  /** Email notifications preferences */
  notifications: z
    .object({
      /** New email notifications */
      newEmails: z.boolean().default(true),

      /** AI summary notifications */
      aiSummaries: z.boolean().default(true),

      /** Security alerts */
      securityAlerts: z.boolean().default(true),

      /** Marketing emails */
      marketing: z.boolean().default(false),

      /** Weekly digest */
      weeklyDigest: z.boolean().default(true),

      /** Mobile push notifications */
      pushNotifications: z.boolean().default(false),
    })
    .optional(),

  /** UI/UX preferences */
  ui: z
    .object({
      /** Theme preference */
      theme: z.enum(["light", "dark", "system"]).default("system"),

      /** Language preference */
      language: z.string().default("en"),

      /** Timezone */
      timezone: z.string().default("UTC"),

      /** Date format */
      dateFormat: z
        .enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"])
        .default("MM/DD/YYYY"),

      /** Time format */
      timeFormat: z.enum(["12h", "24h"]).default("12h"),

      /** Density preference */
      density: z.enum(["comfortable", "compact"]).default("comfortable"),
    })
    .optional(),

  /** Privacy preferences */
  privacy: z
    .object({
      /** Profile visibility */
      profileVisibility: z.enum(["public", "private"]).default("private"),

      /** Usage analytics */
      allowAnalytics: z.boolean().default(true),

      /** Error reporting */
      allowErrorReporting: z.boolean().default(true),

      /** Data retention period */
      dataRetentionDays: z.number().int().min(30).max(3650).default(365), // 1 year default
    })
    .optional(),
});

/**
 * User account deletion schema
 */
export const userAccountDeletionSchema = z.object({
  /** Current password for verification */
  currentPassword: z.string().min(1, "Current password is required"),

  /** Deletion confirmation */
  confirmDeletion: z.boolean().refine((val) => val === true, {
    message: "You must confirm account deletion",
  }),

  /** Reason for deletion */
  reason: z
    .enum([
      "not_useful",
      "too_expensive",
      "missing_features",
      "privacy_concerns",
      "switching_service",
      "other",
    ])
    .optional(),

  /** Additional feedback */
  feedback: z.string().trim().max(1000, "Feedback is too long").optional(),
});

/**
 * User invitation schema
 */
export const userInvitationSchema = z.object({
  /** Email address to invite */
  email: stringValidations.email,

  /** User role */
  role: z.enum(["admin", "user", "viewer"]).default("user"),

  /** Personal message */
  message: z.string().trim().max(500, "Message is too long").optional(),

  /** Expiration date */
  expiresAt: dateValidations.future.optional(),
});

/**
 * User role update schema
 */
export const userRoleUpdateSchema = z.object({
  /** New role */
  role: z.enum(["admin", "user", "viewer"]),

  /** Reason for role change */
  reason: z.string().trim().max(200, "Reason is too long").optional(),
});

/**
 * User session schema
 */
export const userSessionSchema = z.object({
  /** Session ID */
  id: stringValidations.uuid,

  /** User ID */
  userId: stringValidations.uuid,

  /** Device information */
  device: z
    .object({
      /** Device type */
      type: z.enum(["desktop", "mobile", "tablet"]).optional(),

      /** Operating system */
      os: z.string().max(50).optional(),

      /** Browser */
      browser: z.string().max(50).optional(),

      /** IP address */
      ipAddress: z
        .string()
        .regex(
          /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
          "Invalid IP address"
        )
        .optional(),

      /** Location */
      location: z.string().max(100).optional(),
    })
    .optional(),

  /** Session expiration */
  expiresAt: z.date(),

  /** Last activity */
  lastActivityAt: z.date(),
});
