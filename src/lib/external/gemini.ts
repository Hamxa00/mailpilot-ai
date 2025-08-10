/**
 * @fileoverview Google Gemini AI provider implementation
 * @description Gemini AI service integration for MailPilot AI
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  ChatSession,
} from "@google/generative-ai";
import { logger } from "../logging";
import { measureAsync } from "../logging/log-utilities";
import { ExternalServiceError, ValidationError } from "../errors";
import type {
  AIProvider,
  AIProviderConfig,
  AIMessage,
  AIResponse,
  EmailSummaryRequest,
  EmailComposeRequest,
} from "./types/ai-types";

/**
 * Google Gemini AI provider implementation
 */
export class GeminiProvider implements AIProvider {
  public readonly type = "gemini" as const;
  public readonly config: AIProviderConfig;

  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private chatSession: ChatSession | null = null;
  private initialized = false;

  constructor(config: AIProviderConfig) {
    this.config = {
      model: "gemini-pro",
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Initialize the Gemini provider
   */
  public async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      if (!this.config.apiKey) {
        throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
          message: "Gemini API key is required",
          context: { field: "apiKey" },
        });
      }

      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: this.config.model || "gemini-pro",
        generationConfig: {
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
      });

      this.initialized = true;
      logger.info("Gemini AI provider initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Gemini provider", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Check if Gemini service is healthy
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized || !this.model) {
        await this.initialize();
      }

      // Simple health check with a minimal request
      const result = await this.model!.generateContent("test");
      return !!result.response;
    } catch (error) {
      logger.warn("Gemini health check failed", {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Generate text completion using Gemini
   */
  public async complete(messages: AIMessage[]): Promise<AIResponse> {
    return measureAsync(
      "gemini_complete",
      async () => {
        try {
          if (!this.initialized || !this.model) {
            await this.initialize();
          }

          const startTime = Date.now();

          // Convert messages to Gemini format
          const prompt = this.formatMessagesForGemini(messages);

          // Generate content
          const result = await this.model!.generateContent(prompt);
          const response = result.response;
          const content = response.text();

          const responseTime = Date.now() - startTime;

          return {
            content,
            usage: {
              promptTokens: this.estimateTokens(prompt),
              completionTokens: this.estimateTokens(content),
              totalTokens: this.estimateTokens(prompt + content),
            },
            metadata: {
              model: this.config.model,
              finishReason: response.candidates?.[0]?.finishReason || "stop",
              responseTime,
            },
          };
        } catch (error) {
          logger.error("Gemini completion failed", {
            error: error instanceof Error ? error.message : error,
            messagesCount: messages.length,
          });

          return {
            content: "",
            error: {
              code: "GEMINI_COMPLETION_ERROR",
              message: error instanceof Error ? error.message : "Unknown error",
              details: error,
            },
          };
        }
      },
      { provider: "gemini", operation: "complete" }
    );
  }

  /**
   * Generate email summary using Gemini
   */
  public async summarizeEmail(
    request: EmailSummaryRequest
  ): Promise<AIResponse> {
    const prompt = this.buildSummaryPrompt(request);

    return this.complete([
      {
        role: "system",
        content:
          "You are an expert email assistant that provides concise, accurate summaries of emails.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);
  }

  /**
   * Generate email composition using Gemini
   */
  public async composeEmail(request: EmailComposeRequest): Promise<AIResponse> {
    const prompt = this.buildComposePrompt(request);

    return this.complete([
      {
        role: "system",
        content:
          "You are a professional email writing assistant that helps compose clear, effective emails.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);
  }

  /**
   * Extract key information from email
   */
  public async extractKeyInfo(emailContent: string): Promise<{
    keyPoints: string[];
    actionItems: string[];
    sentiment: "positive" | "negative" | "neutral";
    urgency: "low" | "medium" | "high";
    category: string;
  }> {
    const prompt = `
Analyze the following email and extract key information:

Email Content:
${emailContent}

Please provide a structured analysis in the following JSON format:
{
  "keyPoints": ["point1", "point2", ...],
  "actionItems": ["action1", "action2", ...],
  "sentiment": "positive|negative|neutral",
  "urgency": "low|medium|high",
  "category": "category_name"
}

Respond only with valid JSON.
    `;

    const response = await this.complete([
      {
        role: "system",
        content:
          "You are an email analysis expert. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    try {
      const analysis = JSON.parse(response.content);
      return {
        keyPoints: analysis.keyPoints || [],
        actionItems: analysis.actionItems || [],
        sentiment: analysis.sentiment || "neutral",
        urgency: analysis.urgency || "low",
        category: analysis.category || "general",
      };
    } catch (error) {
      logger.warn("Failed to parse Gemini analysis response", {
        response: response.content,
        error: error instanceof Error ? error.message : error,
      });

      // Return default values
      return {
        keyPoints: [],
        actionItems: [],
        sentiment: "neutral",
        urgency: "low",
        category: "general",
      };
    }
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    try {
      this.chatSession = null;
      this.model = null;
      this.genAI = null;
      this.initialized = false;

      logger.info("Gemini provider disposed successfully");
    } catch (error) {
      logger.warn("Error disposing Gemini provider", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Format messages for Gemini API
   */
  private formatMessagesForGemini(messages: AIMessage[]): string {
    return messages
      .map((message) => {
        const roleLabel = message.role === "assistant" ? "Assistant" : "User";
        return `${roleLabel}: ${message.content}`;
      })
      .join("\n\n");
  }

  /**
   * Build summary prompt
   */
  private buildSummaryPrompt(request: EmailSummaryRequest): string {
    const { emailContent, metadata, preferences } = request;

    let prompt = `Please summarize the following email:\n\n${emailContent}\n\n`;

    if (metadata) {
      prompt += `Email Details:\n`;
      if (metadata.subject) prompt += `Subject: ${metadata.subject}\n`;
      if (metadata.sender) prompt += `From: ${metadata.sender}\n`;
      if (metadata.date)
        prompt += `Date: ${metadata.date.toLocaleDateString()}\n`;
      prompt += `\n`;
    }

    if (preferences) {
      prompt += `Summary Requirements:\n`;
      if (preferences.length) prompt += `Length: ${preferences.length}\n`;
      if (preferences.tone) prompt += `Tone: ${preferences.tone}\n`;
      if (preferences.includeKeyPoints) prompt += `- Include key points\n`;
      if (preferences.includeActionItems) prompt += `- Include action items\n`;
    }

    return prompt;
  }

  /**
   * Build compose prompt
   */
  private buildComposePrompt(request: EmailComposeRequest): string {
    const { prompt, type, originalEmail, preferences } = request;

    let fullPrompt = `${prompt}\n\n`;

    if (originalEmail && type) {
      fullPrompt += `Context (Original Email for ${type}):\n${originalEmail}\n\n`;
    }

    if (preferences) {
      fullPrompt += `Email Requirements:\n`;
      if (preferences.tone) fullPrompt += `Tone: ${preferences.tone}\n`;
      if (preferences.length) fullPrompt += `Length: ${preferences.length}\n`;
      if (preferences.includeGreeting) fullPrompt += `- Include greeting\n`;
      if (preferences.includeClosing) fullPrompt += `- Include closing\n`;
    }

    return fullPrompt;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for most languages
    return Math.ceil(text.length / 4);
  }
}

/**
 * Create and initialize Gemini provider
 */
export const createGeminiProvider = async (
  config: Omit<AIProviderConfig, "type">
): Promise<GeminiProvider> => {
  const provider = new GeminiProvider({
    ...config,
    type: "gemini",
  });

  await provider.initialize();
  return provider;
};
