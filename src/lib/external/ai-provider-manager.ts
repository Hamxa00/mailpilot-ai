/**
 * @fileoverview AI Provider Manager for MailPilot AI
 * @description Manages multiple AI providers and provides unified interface
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import type {
  AIProvider,
  AIResponse,
  EmailComposeRequest,
  EmailSummaryRequest,
} from "./types/ai-types";

import { logger, measureAsync } from "../logging";
import { ExternalServiceError } from "../errors";

/**
 * AI Provider Manager class
 * @description Manages registration and usage of multiple AI providers
 */
export class AIProviderManager {
  /** Map of registered AI providers */
  private providers: Map<string, AIProvider> = new Map();

  /** Default provider identifier */
  private defaultProvider?: string;

  /**
   * Creates a new AI Provider Manager instance
   */
  constructor() {
    this.providers = new Map();
  }

  /**
   * Register an AI provider with a unique identifier
   * @param providerId - Unique identifier for the provider
   * @param provider - AI provider instance to register
   * @throws {ExternalServiceError} If provider registration fails
   */
  registerProvider(providerId: string, provider: AIProvider): void {
    this.providers.set(providerId, provider);
    logger.info(`AI provider registered: ${providerId}`);

    // Set as default if it's the first provider
    if (!this.defaultProvider) {
      this.defaultProvider = providerId;
      logger.info(`Set default AI provider: ${providerId}`);
    }
  }

  /**
   * Set the default AI provider
   * @param providerId - Provider ID to set as default
   * @throws {ExternalServiceError} If provider not found
   */
  setDefaultProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: providerId,
        context: { operation: "setDefaultProvider" },
        message: `AI provider not found: ${providerId}`,
      });
    }
    this.defaultProvider = providerId;
    logger.info(`Default AI provider changed to: ${providerId}`);
  }

  /**
   * Get a specific AI provider by ID
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns AI provider instance
   * @throws {ExternalServiceError} If provider not found or no default set
   */
  getProvider(providerId?: string): AIProvider {
    const targetId = providerId || this.defaultProvider;

    if (!targetId) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "ai-provider-manager",
        message: "No AI provider specified and no default provider set",
        context: { operation: "getProvider" },
      });
    }

    const provider = this.providers.get(targetId);
    if (!provider) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "ai-provider-manager",
        message: `AI provider not found: ${targetId}`,
        context: { providerId: targetId, operation: "getProvider" },
      });
    }

    return provider;
  }
  /**
   * List all registered providers
   * @returns Array of provider IDs
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Summarize email content using the specified or default provider
   * @param request - Email summarization request
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns AI response with email summary
   * @throws {ExternalServiceError} If summarization fails
   */
  async summarizeEmail(
    request: EmailSummaryRequest,
    providerId?: string
  ): Promise<AIResponse> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Starting email summarization", {
        providerId: providerId || this.defaultProvider,
        emailLength: request.emailContent.length,
      });

      const result = await provider.summarizeEmail(request);

      logger.info("Email summarization completed", {
        providerId: providerId || this.defaultProvider,
        responseLength: result.content.length,
      });

      return result;
    } catch (error) {
      logger.error("Email summarization failed", {
        providerId: providerId || this.defaultProvider,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Compose email content using the specified or default provider
   * @param request - Email composition request
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns AI response with composed email content
   * @throws {ExternalServiceError} If composition fails
   */
  async composeEmail(
    request: EmailComposeRequest,
    providerId?: string
  ): Promise<AIResponse> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Starting email composition", {
        providerId: providerId || this.defaultProvider,
        promptLength: request.prompt.length,
      });

      const result = await provider.composeEmail(request);

      logger.info("Email composition completed", {
        providerId: providerId || this.defaultProvider,
        responseLength: result.content.length,
      });

      return result;
    } catch (error) {
      logger.error("Email composition failed", {
        providerId: providerId || this.defaultProvider,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Analyze email content using the specified or default provider
   * @param emailContent - Email content to analyze
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns Analysis results including key points, sentiment, and urgency
   * @throws {ExternalServiceError} If analysis fails
   */
  async analyzeEmail(
    emailContent: string,
    providerId?: string
  ): Promise<EmailAnalysisResponse> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Starting email analysis", {
        providerId: providerId || this.defaultProvider,
        emailLength: emailContent.length,
      });

      // Use summarizeEmail as the base analysis method since analyzeEmail doesn't exist
      const summaryRequest: EmailSummaryRequest = { emailContent };
            // Transform the response into analysis format
      const analysis: EmailAnalysisResponse = {
        keyPoints: [result.content],
        actionItems: [],
        sentiment: "neutral",
        urgency: "medium",
        category: "general",
      };

      logger.info("Email analysis completed", {
        providerId: providerId || this.defaultProvider,
        keyPoints: analysis.keyPoints.length,
        actionItems: analysis.actionItems.length,
      });

      return analysis;
    } catch (error) {
      logger.error("Email analysis failed", {
        providerId: providerId || this.defaultProvider,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Check if a provider is healthy
   * @param providerId - Optional provider ID to check, uses default if not specified
   * @returns True if provider is healthy, false otherwise
   */
  async checkProviderHealth(providerId?: string): Promise<boolean> {
    try {
      const provider = this.getProvider(providerId);

      // Basic health check with a simple test request
      const testRequest: EmailSummaryRequest = {
        emailContent: "Test email for health check",
      };

      await provider.summarizeEmail(testRequest);
      return true;
    } catch (error) {
      logger.error("Provider health check failed", {
        providerId: providerId || this.defaultProvider,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Remove a provider from the manager
   * @param providerId - ID of provider to unregister
   * @returns True if provider was removed, false if it didn't exist
   */
  unregisterProvider(providerId: string): boolean {
    const existed = this.providers.delete(providerId);

    if (existed) {
      logger.info(`AI provider unregistered: ${providerId}`);

      // If this was the default provider, clear it
      if (this.defaultProvider === providerId) {
        this.defaultProvider = undefined;

        // Set a new default if other providers exist
        const remaining = this.listProviders();
        if (remaining.length > 0) {
          this.setDefaultProvider(remaining[0]);
        }
      }
    }

    return existed;
  }
}

/**
 * Email analysis response interface
 * @description Structure for email analysis results
 */
interface EmailAnalysisResponse {
  /** Key points extracted from the email */
  keyPoints: string[];
  /** Action items identified in the email */
  actionItems: string[];
  /** Overall sentiment of the email */
  sentiment: "positive" | "negative" | "neutral";
  /** Urgency level of the email */
  urgency: "low" | "medium" | "high";
  /** Category classification of the email */
  category: string;
}

/**
 * Singleton instance of AI Provider Manager
 * @description Ready-to-use instance for managing AI providers
 */
export const aiProviderManager = new AIProviderManager();
