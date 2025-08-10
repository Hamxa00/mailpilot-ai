/**
 * @fileoverview Email validation schemas for MailPilot AI
 * @description Email-related validation schemas for accounts, messages, and operations
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { z } from "zod";
import {
  stringValidations,
  numberValidations,
  fileUploadSchema,
  paginationSchema,
} from "./common-schemas";

/**
 * Email address validation schema
 */
export const emailAddressSchema = z.object({
  /** Email address */
  address: stringValidations.email,

  /** Display name */
  name: z.string().trim().max(100, "Display name is too long").optional(),

  /** Whether this is a verified address */
  verified: z.boolean().optional().default(false),
});

/**
 * Email account connection schema
 */
export const emailAccountConnectionSchema = z.object({
  /** Provider type */
  provider: z.enum(["gmail", "outlook", "yahoo", "imap", "exchange"]),

  /** Account email address */
  email: stringValidations.email,

  /** Display name for the account */
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(100, "Display name is too long"),

  /** OAuth configuration (for OAuth providers) */
  oauth: z
    .object({
      /** Access token */
      accessToken: z.string().min(1, "Access token is required"),

      /** Refresh token */
      refreshToken: z.string().optional(),

      /** Token expiration */
      expiresAt: z.date().optional(),

      /** OAuth scopes */
      scopes: z.array(z.string()).optional(),
    })
    .optional(),

  /** IMAP/SMTP configuration (for IMAP providers) */
  config: z
    .object({
      /** IMAP server settings */
      imap: z.object({
        host: z.string().min(1, "IMAP host is required"),
        port: numberValidations.port,
        secure: z.boolean().default(true),
        username: z.string().min(1, "IMAP username is required"),
        password: z.string().min(1, "IMAP password is required"),
      }),

      /** SMTP server settings */
      smtp: z.object({
        host: z.string().min(1, "SMTP host is required"),
        port: numberValidations.port,
        secure: z.boolean().default(true),
        username: z.string().min(1, "SMTP username is required"),
        password: z.string().min(1, "SMTP password is required"),
      }),
    })
    .optional(),

  /** Sync settings */
  syncSettings: z
    .object({
      /** Auto-sync enabled */
      enabled: z.boolean().default(true),

      /** Sync interval in minutes */
      intervalMinutes: z.number().int().min(1).max(1440).default(5), // 1 minute to 1 day

      /** Sync full history */
      fullSync: z.boolean().default(false),

      /** Days to sync back */
      syncDays: z.number().int().min(1).max(365).default(30),

      /** Folders to sync */
      folders: z.array(z.string()).optional(),
    })
    .optional()
    .default({
      enabled: true,
      intervalMinutes: 5,
      fullSync: false,
      syncDays: 30,
    }),
});

/**
 * Email compose schema
 */
export const emailComposeSchema = z.object({
  /** From address */
  from: emailAddressSchema,

  /** To recipients */
  to: z
    .array(emailAddressSchema)
    .min(1, "At least one recipient is required")
    .max(100, "Too many recipients"),

  /** CC recipients */
  cc: z.array(emailAddressSchema).max(50, "Too many CC recipients").optional(),

  /** BCC recipients */
  bcc: z
    .array(emailAddressSchema)
    .max(50, "Too many BCC recipients")
    .optional(),

  /** Email subject */
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject is too long"),

  /** Email body (HTML) */
  html: z.string().max(1024 * 1024, "Email body is too large"), // 1MB limit

  /** Email body (plain text) */
  text: z
    .string()
    .max(1024 * 1024, "Email body is too large")
    .optional(),

  /** Attachments */
  attachments: z
    .array(fileUploadSchema)
    .max(10, "Too many attachments")
    .optional(),

  /** Reply to message ID */
  inReplyTo: stringValidations.uuid.optional(),

  /** Thread ID */
  threadId: stringValidations.uuid.optional(),

  /** Priority */
  priority: z.enum(["low", "normal", "high"]).default("normal"),

  /** Delivery receipt requested */
  requestDeliveryReceipt: z.boolean().default(false),

  /** Read receipt requested */
  requestReadReceipt: z.boolean().default(false),

  /** Scheduled send time */
  scheduledAt: z
    .date()
    .min(new Date(), "Scheduled time must be in the future")
    .optional(),
});

/**
 * Email draft schema
 */
export const emailDraftSchema = emailComposeSchema
  .extend({
    /** Draft ID */
    id: stringValidations.uuid.optional(),

    /** Auto-save interval */
    autoSave: z.boolean().default(true),
  })
  .partial({
    from: true,
    to: true,
    subject: true,
    html: true,
  });

/**
 * Email search schema
 */
export const emailSearchSchema = z.object({
  /** Search query */
  query: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(500, "Search query is too long"),

  /** Search in specific account */
  accountId: stringValidations.uuid.optional(),

  /** Search in specific folder */
  folderId: stringValidations.uuid.optional(),

  /** Search filters */
  filters: z
    .object({
      /** From address */
      from: z.string().email().optional(),

      /** To address */
      to: z.string().email().optional(),

      /** Has attachments */
      hasAttachments: z.boolean().optional(),

      /** Is unread */
      isUnread: z.boolean().optional(),

      /** Is starred */
      isStarred: z.boolean().optional(),

      /** Date range */
      dateRange: z
        .object({
          from: z.date(),
          to: z.date(),
        })
        .optional(),

      /** Size range (in bytes) */
      sizeRange: z
        .object({
          min: z.number().int().nonnegative().optional(),
          max: z.number().int().nonnegative().optional(),
        })
        .optional(),

      /** Labels */
      labels: z.array(z.string()).optional(),
    })
    .optional(),

  /** Search type */
  searchType: z.enum(["basic", "semantic", "advanced"]).default("basic"),

  /** Pagination */
  ...paginationSchema.shape,
});

/**
 * Email bulk operation schema
 */
export const emailBulkOperationSchema = z.object({
  /** Email IDs */
  emailIds: z
    .array(stringValidations.uuid)
    .min(1, "At least one email is required")
    .max(100, "Too many emails"),

  /** Operation to perform */
  operation: z.enum([
    "mark_read",
    "mark_unread",
    "star",
    "unstar",
    "archive",
    "unarchive",
    "delete",
    "move_to_folder",
    "add_label",
    "remove_label",
    "mark_important",
    "mark_not_important",
  ]),

  /** Additional data for the operation */
  data: z
    .object({
      /** Folder ID (for move_to_folder) */
      folderId: stringValidations.uuid.optional(),

      /** Label name (for add_label/remove_label) */
      label: z.string().max(50).optional(),
    })
    .optional(),
});

/**
 * Email folder schema
 */
export const emailFolderSchema = z.object({
  /** Folder name */
  name: z
    .string()
    .trim()
    .min(1, "Folder name is required")
    .max(100, "Folder name is too long")
    .regex(/^[^\/\\:*?"<>|]+$/, "Invalid characters in folder name"),

  /** Folder color */
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    .optional(),

  /** Parent folder ID */
  parentId: stringValidations.uuid.optional(),

  /** Folder type */
  type: z
    .enum(["inbox", "sent", "draft", "trash", "archive", "spam", "custom"])
    .default("custom"),

  /** Sort order */
  sortOrder: numberValidations.nonNegativeInt.optional(),
});

/**
 * Email label schema
 */
export const emailLabelSchema = z.object({
  /** Label name */
  name: z
    .string()
    .trim()
    .min(1, "Label name is required")
    .max(50, "Label name is too long")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Invalid characters in label name"),

  /** Label color */
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),

  /** Label description */
  description: z.string().trim().max(200, "Description is too long").optional(),
});

/**
 * Email template schema
 */
export const emailTemplateSchema = z.object({
  /** Template name */
  name: z
    .string()
    .trim()
    .min(1, "Template name is required")
    .max(100, "Template name is too long"),

  /** Template subject */
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject is too long"),

  /** Template body (HTML) */
  html: z
    .string()
    .min(1, "Template body is required")
    .max(1024 * 1024, "Template is too large"),

  /** Template body (plain text) */
  text: z
    .string()
    .max(1024 * 1024, "Template is too large")
    .optional(),

  /** Template variables */
  variables: z
    .array(
      z.object({
        name: z
          .string()
          .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid variable name"),
        description: z.string().max(100).optional(),
        required: z.boolean().default(false),
        defaultValue: z.string().optional(),
      })
    )
    .optional(),

  /** Template category */
  category: z
    .enum(["personal", "business", "marketing", "support", "other"])
    .default("personal"),

  /** Template tags */
  tags: z.array(z.string().max(20)).max(10, "Too many tags").optional(),
});

/**
 * Email signature schema
 */
export const emailSignatureSchema = z.object({
  /** Signature name */
  name: z
    .string()
    .trim()
    .min(1, "Signature name is required")
    .max(50, "Signature name is too long"),

  /** Signature HTML */
  html: z.string().max(10 * 1024, "Signature is too large"), // 10KB limit

  /** Signature plain text */
  text: z
    .string()
    .max(2 * 1024, "Signature is too large")
    .optional(), // 2KB limit

  /** Is default signature */
  isDefault: z.boolean().default(false),

  /** Use for replies */
  useForReplies: z.boolean().default(true),

  /** Use for forwards */
  useForForwards: z.boolean().default(false),
});

/**
 * Email auto-responder schema
 */
export const emailAutoResponderSchema = z
  .object({
    /** Auto-responder name */
    name: z
      .string()
      .trim()
      .min(1, "Auto-responder name is required")
      .max(100, "Auto-responder name is too long"),

    /** Is enabled */
    enabled: z.boolean().default(false),

    /** Subject line */
    subject: z
      .string()
      .trim()
      .min(1, "Subject is required")
      .max(200, "Subject is too long"),

    /** Message body */
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(5 * 1024, "Message is too long"), // 5KB limit

    /** Start date */
    startDate: z.date(),

    /** End date */
    endDate: z.date(),

    /** Only reply once per sender */
    oncePerSender: z.boolean().default(true),

    /** Reply to specific conditions */
    conditions: z
      .object({
        /** Only reply to internal emails */
        internalOnly: z.boolean().default(false),

        /** Exclude mailing lists */
        excludeMailingLists: z.boolean().default(true),

        /** Only reply to contacts */
        contactsOnly: z.boolean().default(false),
      })
      .optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });
