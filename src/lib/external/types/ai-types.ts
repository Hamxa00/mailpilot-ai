/**
 * @fileoverview AI service type definitions
 * @description Type definitions for AI service providers
 * @author MailPilot AI Team
 * @version 1.0.0
 */

/**
 * Supported AI provider types
 * @description Currently supported AI providers for the application
 */
export type AIProviderType = "gemini" | "claude" | "custom";

/**
 * AI provider configuration interface
 */
export interface AIProviderConfig {
  /** Provider type */
  type: AIProviderType;

  /** API key for authentication */
  apiKey: string;

  /** API endpoint URL (optional, uses default if not provided) */
  endpoint?: string;

  /** Model name/version to use */
  model?: string;

  /** Maximum tokens in response */
  maxTokens?: number;

  /** Temperature for randomness (0-1) */
  temperature?: number;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute?: number;
  };
}

/**
 * AI request message structure
 */
export interface AIMessage {
  /** Message role */
  role: "system" | "user" | "assistant";

  /** Message content */
  content: string;

  /** Optional message metadata */
  metadata?: Record<string, any>;
}

/**
 * AI response from providers
 */
export interface AIResponse {
  /** Generated content */
  content: string;

  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Response metadata */
  metadata?: {
    model?: string;
    finishReason?: string;
    responseTime?: number;
  };

  /** Error information if request failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Email summarization request
 */
export interface EmailSummaryRequest {
  /** Email content to summarize */
  emailContent: string;

  /** Email metadata */
  metadata?: {
    subject?: string;
    sender?: string;
    recipient?: string;
    date?: Date;
  };

  /** Summary preferences */
  preferences?: {
    length?: "short" | "medium" | "long";
    tone?: "formal" | "casual" | "technical";
    includeKeyPoints?: boolean;
    includeActionItems?: boolean;
  };
}

/**
 * Email composition request
 */
export interface EmailComposeRequest {
  /** Context or prompt for composition */
  prompt: string;

  /** Email type */
  type?: "reply" | "forward" | "new" | "follow-up";

  /** Original email content (for replies/forwards) */
  originalEmail?: string;

  /** Composition preferences */
  preferences?: {
    tone?: "professional" | "friendly" | "formal" | "casual";
    length?: "brief" | "detailed";
    includeGreeting?: boolean;
    includeClosing?: boolean;
  };
}

/**
 * Base AI provider interface
 */
export interface AIProvider {
  /** Provider type identifier */
  readonly type: AIProviderType;

  /** Provider configuration */
  readonly config: AIProviderConfig;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Check if provider is healthy/available
   */
  healthCheck(): Promise<boolean>;

  /**
   * Generate text completion
   */
  complete(messages: AIMessage[]): Promise<AIResponse>;

  /**
   * Generate email summary
   */
  summarizeEmail(request: EmailSummaryRequest): Promise<AIResponse>;

  /**
   * Generate email composition
   */
  composeEmail(request: EmailComposeRequest): Promise<AIResponse>;

  /**
   * Extract key information from email
   */
  extractKeyInfo(emailContent: string): Promise<{
    keyPoints: string[];
    actionItems: string[];
    sentiment: "positive" | "negative" | "neutral";
    urgency: "low" | "medium" | "high";
    category: string;
  }>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}
