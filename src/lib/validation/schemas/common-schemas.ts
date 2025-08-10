/**
 * @fileoverview Common validation schemas for MailPilot AI
 * @description Reusable validation schemas using Zod for consistent data validation
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { z } from "zod";

/**
 * Common string validations
 */
export const stringValidations = {
  /** Non-empty string with trimming */
  nonEmpty: z.string().trim().min(1, "This field is required"),

  /** Email validation */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address format")
    .max(254, "Email address is too long"),

  /** Strong password validation */
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password is too long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character"
    ),

  /** URL validation */
  url: z.string().url("Invalid URL format").max(2048, "URL is too long"),

  /** UUID validation */
  uuid: z.string().uuid("Invalid UUID format"),

  /** Slug validation (URL-friendly string) */
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9-]+$/,
      "Must contain only lowercase letters, numbers, and hyphens"
    )
    .min(3, "Must be at least 3 characters long")
    .max(50, "Must be less than 50 characters"),

  /** Phone number validation (international format) */
  phone: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{1,14}$/,
      "Invalid phone number format (use international format with +)"
    ),

  /** Hex color validation */
  hexColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color format"),

  /** JSON string validation */
  jsonString: z.string().refine(
    (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid JSON format" }
  ),
};

/**
 * Common number validations
 */
export const numberValidations = {
  /** Positive integer */
  positiveInt: z.number().int().positive("Must be a positive integer"),

  /** Non-negative integer */
  nonNegativeInt: z
    .number()
    .int()
    .nonnegative("Must be a non-negative integer"),

  /** Port number */
  port: z
    .number()
    .int()
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be less than 65536"),

  /** Percentage (0-100) */
  percentage: z
    .number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Percentage must be at most 100"),

  /** Currency amount (in cents) */
  currency: z.number().int().nonnegative("Amount must be non-negative"),
};

/**
 * Common date validations
 */
export const dateValidations = {
  /** Future date */
  future: z.date().refine((date) => date > new Date(), {
    message: "Date must be in the future",
  }),

  /** Past date */
  past: z.date().refine((date) => date < new Date(), {
    message: "Date must be in the past",
  }),

  /** Birth date (reasonable age range) */
  birthDate: z.date().refine(
    (date) => {
            const age = now.getFullYear() - date.getFullYear();
      return age >= 13 && age <= 120;
    },
    { message: "Invalid birth date" }
  ),

  /** ISO date string */
  isoString: z.string().datetime({ message: "Invalid ISO date format" }),
};

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  /** Page number (1-based) */
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(1000, "Page number too large")),

  /** Items per page */
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100, "Limit too large")),

  /** Sort field */
  sortBy: z.string().optional(),

  /** Sort direction */
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  /** Search query string */
  q: stringValidations.nonEmpty.max(200, "Search query too long"),

  /** Search filters */
  filters: z.record(z.string(), z.string()).optional(),

  /** Pagination */
  ...paginationSchema.shape,
});

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  /** File name */
  name: z
    .string()
    .trim()
    .min(1, "File name is required")
    .max(255, "File name too long")
    .regex(/^[^<>:"/\\|?*\x00-\x1f]+$/, "Invalid file name characters"),

  /** File size in bytes */
  size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, "File size too large (max 50MB)"),

  /** MIME type */
  type: z
    .string()
    .regex(/^[a-z]+\/[a-z0-9\-.+]+$/i, "Invalid MIME type format"),

  /** File content (base64 or buffer) */
  content: z.union([z.string(), z.instanceof(Buffer)]),
});

/**
 * API key schema
 */
export const apiKeySchema = z.object({
  /** API key name/label */
  name: z
    .string()
    .trim()
    .min(3, "API key name must be at least 3 characters")
    .max(50, "API key name too long")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Invalid characters in API key name"),

  /** API key permissions */
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required"),

  /** Expiration date (optional) */
  expiresAt: dateValidations.future.optional(),

  /** Rate limit override */
  rateLimit: z
    .object({
      requests: numberValidations.positiveInt,
      window: numberValidations.positiveInt,
    })
    .optional(),
});

/**
 * Environment variable validation
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .optional()
    .default("3000")
    .transform(Number)
    .pipe(numberValidations.port),
  DATABASE_URL: stringValidations.url,
  SUPABASE_URL: stringValidations.url,
  SUPABASE_ANON_KEY: stringValidations.nonEmpty,
  NEXTAUTH_SECRET: stringValidations.nonEmpty.min(
    32,
    "Auth secret must be at least 32 characters"
  ),
  NEXTAUTH_URL: stringValidations.url.optional(),
  GEMINI_API_KEY: stringValidations.nonEmpty,
  GMAIL_CLIENT_ID: stringValidations.nonEmpty.optional(),
  GMAIL_CLIENT_SECRET: stringValidations.nonEmpty.optional(),
  STRIPE_SECRET_KEY: stringValidations.nonEmpty,
  STRIPE_WEBHOOK_SECRET: stringValidations.nonEmpty.optional(),
  REDIS_URL: stringValidations.url.optional(),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug"])
    .optional()
    .default("info"),
});

/**
 * ID parameter schema (for route parameters)
 */
export const idParamSchema = z.object({
  id: stringValidations.uuid,
});

/**
 * Bulk operation schema
 */
export const bulkOperationSchema = z.object({
  /** Array of IDs to operate on */
  ids: z
    .array(stringValidations.uuid)
    .min(1, "At least one ID is required")
    .max(100, "Too many IDs (max 100)"),

  /** Operation to perform */
  operation: z.enum(["delete", "archive", "restore", "update"]),

  /** Additional data for the operation */
  data: z.record(z.string(), z.any()).optional(),
});

/**
 * Webhook validation schema
 */
export const webhookSchema = z.object({
  /** Webhook URL */
  url: stringValidations.url,

  /** Events to subscribe to */
  events: z
    .array(z.string())
    .min(1, "At least one event is required")
    .max(20, "Too many events (max 20)"),

  /** Webhook secret for signature verification */
  secret: stringValidations.nonEmpty.min(
    16,
    "Webhook secret must be at least 16 characters"
  ),

  /** Whether webhook is active */
  active: z.boolean().default(true),

  /** Custom headers */
  headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Rate limit configuration schema
 */
export const rateLimitConfigSchema = z.object({
  /** Maximum requests */
  maxRequests: numberValidations.positiveInt.max(10000, "Rate limit too high"),

  /** Window in milliseconds */
  windowMs: numberValidations.positiveInt.max(
    24 * 60 * 60 * 1000,
    "Window too large"
  ), // Max 24 hours

  /** Skip function name */
  skipFunction: z.string().optional(),

  /** Custom error message */
  message: z.string().max(200, "Error message too long").optional(),
});
