/**
 * @fileoverview AI validation schemas for MailPilot AI
 * @description AI-related validation schemas for preferences, summaries, and interactions
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { z } from "zod";
import {
  stringValidations,
  numberValidations,
  paginationSchema,
} from "./common-schemas";

/**
 * AI preference configuration schema
 */
export const aiPreferencesSchema = z.object({
  /** Email summary preferences */
  summarySettings: z
    .object({
      /** Enable AI summaries */
      enabled: z.boolean().default(true),

      /** Summary length preference */
      length: z.enum(["short", "medium", "long"]).default("medium"),

      /** Summary style */
      style: z
        .enum(["bullet_points", "paragraph", "key_highlights"])
        .default("bullet_points"),

      /** Include sentiment analysis */
      includeSentiment: z.boolean().default(true),

      /** Include priority scoring */
      includePriority: z.boolean().default(true),

      /** Include action items extraction */
      includeActionItems: z.boolean().default(true),

      /** Languages for summary */
      languages: z
        .array(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/))
        .default(["en"]),

      /** Auto-summarize threshold (email length) */
      autoSummarizeThreshold: numberValidations.positiveInt.default(500), // characters
    })
    .optional(),

  /** Email categorization preferences */
  categorizationSettings: z
    .object({
      /** Enable auto-categorization */
      enabled: z.boolean().default(true),

      /** Confidence threshold (0-1) */
      confidenceThreshold: z.number().min(0).max(1).default(0.7),

      /** Custom categories */
      customCategories: z
        .array(
          z.object({
            name: z.string().min(1).max(50),
            description: z.string().max(200).optional(),
            keywords: z.array(z.string()).optional(),
            color: z
              .string()
              .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
              .optional(),
          })
        )
        .max(20)
        .optional(),

      /** Auto-apply labels */
      autoApplyLabels: z.boolean().default(false),
    })
    .optional(),

  /** Smart reply preferences */
  smartReplySettings: z
    .object({
      /** Enable smart replies */
      enabled: z.boolean().default(true),

      /** Number of suggestions */
      suggestionCount: z.number().int().min(1).max(5).default(3),

      /** Reply tone */
      tone: z
        .enum(["professional", "casual", "friendly", "formal"])
        .default("professional"),

      /** Reply length */
      length: z.enum(["short", "medium", "long"]).default("medium"),

      /** Include context from thread */
      includeContext: z.boolean().default(true),

      /** Personal writing style learning */
      learnWritingStyle: z.boolean().default(true),
    })
    .optional(),

  /** Spam detection preferences */
  spamDetectionSettings: z
    .object({
      /** Enable AI spam detection */
      enabled: z.boolean().default(true),

      /** Sensitivity level */
      sensitivity: z.enum(["low", "medium", "high"]).default("medium"),

      /** Auto-move to spam */
      autoMoveToSpam: z.boolean().default(false),

      /** Whitelist domains */
      whitelistDomains: z
        .array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/))
        .optional(),

      /** Blacklist domains */
      blacklistDomains: z
        .array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/))
        .optional(),
    })
    .optional(),

  /** General AI preferences */
  general: z
    .object({
      /** AI model preference */
      modelPreference: z
        .enum(["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"])
        .default("gpt-4"),

      /** Data usage for training */
      allowTraining: z.boolean().default(false),

      /** Privacy mode (no data sent to AI) */
      privacyMode: z.boolean().default(false),

      /** Request timeout (seconds) */
      requestTimeout: z.number().int().min(5).max(60).default(30),

      /** Max tokens per request */
      maxTokens: z.number().int().min(100).max(4096).default(1000),
    })
    .optional(),
});

/**
 * AI summary generation request schema
 */
export const aiSummaryRequestSchema = z.object({
  /** Email ID to summarize */
  emailId: stringValidations.uuid,

  /** Summary options */
  options: z
    .object({
      /** Summary length */
      length: z.enum(["short", "medium", "long"]).default("medium"),

      /** Summary style */
      style: z
        .enum(["bullet_points", "paragraph", "key_highlights"])
        .default("bullet_points"),

      /** Include sentiment analysis */
      includeSentiment: z.boolean().default(true),

      /** Include priority scoring */
      includePriority: z.boolean().default(true),

      /** Include action items */
      includeActionItems: z.boolean().default(true),

      /** Target language */
      language: z
        .string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
        .default("en"),

      /** Force regeneration */
      forceRegenerate: z.boolean().default(false),
    })
    .optional(),
});

/**
 * AI batch summary request schema
 */
export const aiBatchSummaryRequestSchema = z.object({
  /** Email IDs to summarize */
  emailIds: z.array(stringValidations.uuid).min(1).max(50), // Limit batch size

  /** Summary options */
  options: z
    .object({
      /** Summary length */
      length: z.enum(["short", "medium", "long"]).default("medium"),

      /** Summary style */
      style: z
        .enum(["bullet_points", "paragraph", "key_highlights"])
        .default("bullet_points"),

      /** Include sentiment analysis */
      includeSentiment: z.boolean().default(true),

      /** Include priority scoring */
      includePriority: z.boolean().default(true),

      /** Include action items */
      includeActionItems: z.boolean().default(true),

      /** Target language */
      language: z
        .string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
        .default("en"),
    })
    .optional(),
});

/**
 * AI categorization request schema
 */
export const aiCategorizationRequestSchema = z.object({
  /** Email ID to categorize */
  emailId: stringValidations.uuid,

  /** Categorization options */
  options: z
    .object({
      /** Custom categories to consider */
      customCategories: z.array(z.string()).optional(),

      /** Confidence threshold */
      confidenceThreshold: z.number().min(0).max(1).default(0.7),

      /** Return multiple categories */
      multipleCategories: z.boolean().default(false),

      /** Include reasoning */
      includeReasoning: z.boolean().default(false),
    })
    .optional(),
});

/**
 * AI smart reply generation schema
 */
export const aiSmartReplyRequestSchema = z.object({
  /** Email ID to generate replies for */
  emailId: stringValidations.uuid,

  /** Reply options */
  options: z
    .object({
      /** Number of reply suggestions */
      count: z.number().int().min(1).max(5).default(3),

      /** Reply tone */
      tone: z
        .enum(["professional", "casual", "friendly", "formal"])
        .default("professional"),

      /** Reply length */
      length: z.enum(["short", "medium", "long"]).default("medium"),

      /** Include context from thread */
      includeContext: z.boolean().default(true),

      /** Custom context/instructions */
      customContext: z.string().max(500).optional(),

      /** Reply language */
      language: z
        .string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
        .default("en"),
    })
    .optional(),
});

/**
 * AI content generation schema
 */
export const aiContentGenerationSchema = z.object({
  /** Type of content to generate */
  type: z.enum([
    "email_draft",
    "subject_line",
    "signature",
    "template",
    "auto_response",
  ]),

  /** Generation prompt/context */
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt is too long"),

  /** Content parameters */
  parameters: z
    .object({
      /** Target audience */
      audience: z
        .enum(["internal", "external", "customer", "vendor", "general"])
        .optional(),

      /** Content tone */
      tone: z
        .enum(["professional", "casual", "friendly", "formal", "persuasive"])
        .default("professional"),

      /** Content length */
      length: z.enum(["short", "medium", "long"]).default("medium"),

      /** Language */
      language: z
        .string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
        .default("en"),

      /** Include call-to-action */
      includeCallToAction: z.boolean().default(false),

      /** Brand voice guidelines */
      brandVoice: z.string().max(500).optional(),
    })
    .optional(),
});

/**
 * Chatbot interaction schema
 */
export const chatbotInteractionSchema = z.object({
  /** User message */
  message: z
    .string()
    .min(1, "Message is required")
    .max(2000, "Message is too long"),

  /** Conversation context */
  context: z
    .object({
      /** Previous messages in conversation */
      conversationId: stringValidations.uuid.optional(),

      /** Email context (if discussing specific email) */
      emailId: stringValidations.uuid.optional(),

      /** Thread context */
      threadId: stringValidations.uuid.optional(),

      /** User intent (detected or specified) */
      intent: z
        .enum([
          "search_emails",
          "compose_email",
          "schedule_meeting",
          "get_summary",
          "manage_contacts",
          "general_help",
          "other",
        ])
        .optional(),
    })
    .optional(),

  /** Interaction preferences */
  preferences: z
    .object({
      /** Response style */
      responseStyle: z
        .enum(["concise", "detailed", "conversational"])
        .default("conversational"),

      /** Include suggestions */
      includeSuggestions: z.boolean().default(true),

      /** Maximum response length */
      maxResponseLength: z.number().int().min(50).max(2000).default(500),
    })
    .optional(),
});

/**
 * Chatbot feedback schema
 */
export const chatbotFeedbackSchema = z.object({
  /** Interaction ID */
  interactionId: stringValidations.uuid,

  /** Feedback rating */
  rating: z.number().int().min(1).max(5),

  /** Feedback type */
  type: z.enum([
    "helpful",
    "not_helpful",
    "incorrect",
    "inappropriate",
    "other",
  ]),

  /** Detailed feedback */
  comment: z.string().max(500).optional(),

  /** Expected response (if different) */
  expectedResponse: z.string().max(1000).optional(),
});

/**
 * AI model usage analytics schema
 */
export const aiUsageAnalyticsSchema = z
  .object({
    /** Time period for analytics */
    period: z.enum(["day", "week", "month", "quarter", "year"]),

    /** Start date */
    startDate: z.date(),

    /** End date */
    endDate: z.date(),

    /** Metrics to include */
    metrics: z
      .array(
        z.enum([
          "summary_count",
          "categorization_count",
          "smart_reply_count",
          "chatbot_interactions",
          "tokens_used",
          "api_calls",
          "success_rate",
          "user_satisfaction",
        ])
      )
      .min(1)
      .optional(),

    /** Group by */
    groupBy: z.enum(["user", "account", "model", "feature"]).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

/**
 * AI training data schema
 */
export const aiTrainingDataSchema = z.object({
  /** Input text */
  input: z.string().min(1).max(10000),

  /** Expected output */
  expectedOutput: z.string().min(1).max(5000),

  /** Task type */
  taskType: z.enum([
    "summarization",
    "categorization",
    "sentiment",
    "reply_generation",
  ]),

  /** Quality score */
  qualityScore: z.number().min(0).max(1).optional(),

  /** Metadata */
  metadata: z
    .object({
      /** Source of the training data */
      source: z.string().optional(),

      /** Tags for categorization */
      tags: z.array(z.string()).optional(),

      /** Difficulty level */
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    })
    .optional(),
});

/**
 * AI model evaluation schema
 */
export const aiModelEvaluationSchema = z.object({
  /** Model identifier */
  modelId: z.string().min(1),

  /** Evaluation metrics */
  metrics: z.object({
    /** Accuracy score */
    accuracy: z.number().min(0).max(1),

    /** Precision score */
    precision: z.number().min(0).max(1),

    /** Recall score */
    recall: z.number().min(0).max(1),

    /** F1 score */
    f1Score: z.number().min(0).max(1),

    /** User satisfaction score */
    userSatisfaction: z.number().min(0).max(1),
  }),

  /** Test dataset info */
  testDataset: z.object({
    /** Dataset size */
    size: numberValidations.positiveInt,

    /** Dataset version */
    version: z.string(),

    /** Evaluation date */
    evaluatedAt: z.date(),
  }),

  /** Performance details */
  performance: z.object({
    /** Average response time (ms) */
    avgResponseTime: numberValidations.positiveInt,

    /** Success rate */
    successRate: z.number().min(0).max(1),

    /** Error rate */
    errorRate: z.number().min(0).max(1),
  }),
});
