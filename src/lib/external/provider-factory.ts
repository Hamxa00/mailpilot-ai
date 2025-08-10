/**
 * @fileoverview Provider Factory for MailPilot AI
 * @description Factory functions for creating and configuring external service providers
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import type { GeminiProvider } from "./gemini";
import type { GmailProvider } from "./email-providers";
import type { StripeProviderImpl } from "./stripe";
import type { supabaseProvider } from "./supabase";
import type { AIProvider } from "./types/ai-types";
import type { EmailProvider } from "./types/email-types";
import type { StripeProvider } from "./types/stripe-types";

import { aiProviderManager } from "./ai-provider-manager";
import { emailProviderManager } from "./email-provider-manager";
import { logger } from "../logging";
import { ExternalServiceError, ValidationError } from "../errors";

/**
 * Provider factory configuration interface
 * @description Configuration options for all supported providers
 */
export interface ProviderFactoryConfig {
  /** Gemini AI configuration */
  gemini?: {
    /** Gemini API key */
    apiKey: string;
    /** Model to use (optional) */
    model?: string;
    /** Maximum tokens for responses (optional) */
    maxTokens?: number;
  };

  /** Gmail configuration */
  gmail?: {
    /** Gmail client ID */
    clientId: string;
    /** Gmail client secret */
    clientSecret: string;
    /** OAuth redirect URI */
    redirectUri: string;
    /** OAuth scopes (optional) */
    scopes?: string[];
  };

  /** Supabase configuration */
  supabase?: {
    /** Supabase project URL */
    url: string;
    /** Supabase anonymous key */
    anonKey: string;
    /** Supabase service role key (optional) */
    serviceRoleKey?: string;
  };

  /** Stripe configuration */
  stripe?: {
    /** Stripe secret key */
    secretKey: string;
    /** Stripe webhook secret (optional) */
    webhookSecret?: string;
    /** API version to use (optional) */
    apiVersion?: string;
  };
}

/**
 * Create and configure AI providers
 * @param type - Type of AI provider to create
 * @param config - Provider factory configuration
 * @returns Configured AI provider instance
 * @throws {Error} If provider configuration is invalid
 */
export async function createAIProvider(
  type: "gemini",
  config: ProviderFactoryConfig
): Promise<AIProvider> {
  try {
    logger.info(`Creating AI provider: ${type}`);

    switch (type) {
      case "gemini":
        if (!config.gemini) {
          throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
            message: "Gemini configuration is required",
            context: { field: "gemini" },
          });
        }

        const { GeminiProvider } = await import("./gemini");
        const geminiProvider = new GeminiProvider({
          type: "gemini" as const,
          apiKey: config.gemini.apiKey,
          model: config.gemini.model,
          maxTokens: config.gemini.maxTokens,
        });

        logger.info("Gemini AI provider created successfully");
        return geminiProvider;

      default:
        throw new ValidationError("VALIDATION_INVALID_INPUT", {
          message: `Unsupported AI provider type: ${type}`,
          context: { type },
        });
    }
  } catch (error) {
    logger.error("Failed to create AI provider", {
      type,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Create and configure email providers
 * @param type - Type of email provider to create
 * @param config - Provider factory configuration
 * @returns Configured email provider instance
 * @throws {Error} If provider configuration is invalid
 */
export async function createEmailProvider(
  type: "gmail",
  config: ProviderFactoryConfig
): Promise<EmailProvider> {
  try {
    logger.info(`Creating email provider: ${type}`);

    switch (type) {
      case "gmail":
        if (!config.gmail) {
          throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
            message: "Gmail configuration is required",
            context: { field: "gmail" },
          });
        }

        const { GmailProvider } = await import("./email-providers");
        const gmailProvider = new GmailProvider({
          type: "gmail" as const,
          credentials: {
            clientId: config.gmail.clientId,
            clientSecret: config.gmail.clientSecret,
          },
        });

        logger.info("Gmail provider created successfully");
        return gmailProvider;

      default:
        throw new ValidationError("VALIDATION_INVALID_INPUT", {
          message: `Unsupported email provider type: ${type}`,
          context: { type },
        });
    }
  } catch (error) {
    logger.error("Failed to create email provider", {
      type,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Create and configure Supabase integration
 * @param config - Provider factory configuration
 * @returns Configured Supabase provider instance
 * @throws {Error} If Supabase configuration is invalid
 */
export async function createSupabaseProvider(
  config: ProviderFactoryConfig
): Promise<typeof supabaseProvider> {
  try {
    logger.info("Creating Supabase provider");

    if (!config.supabase) {
      throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
        message: "Supabase configuration is required",
        context: { field: "supabase" },
      });
    }

    const { supabaseProvider } = await import("./supabase");

    logger.info("Supabase provider created successfully");
    return supabaseProvider;
  } catch (error) {
    logger.error("Failed to create Supabase provider", {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Create and configure Stripe provider
 * @param config - Provider factory configuration
 * @returns Configured Stripe provider instance
 * @throws {ValidationError} If Stripe configuration is invalid
 */
export async function createStripeProvider(
  config: ProviderFactoryConfig
): Promise<StripeProvider> {
  try {
    logger.info("Creating Stripe provider");

    if (!config.stripe) {
      throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
        message: "Stripe configuration is required",
        context: { field: "stripe" },
      });
    }

    const { StripeProviderImpl } = await import("./stripe");
    const stripeProvider = new StripeProviderImpl({
      secretKey: config.stripe.secretKey,
      webhookSecret: config.stripe.webhookSecret,
      apiVersion: config.stripe.apiVersion,
    });

    await stripeProvider.initialize();
    logger.info("Stripe provider created successfully");
    return stripeProvider;
  } catch (error) {
    logger.error("Failed to create Stripe provider", {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Initialize all providers with configuration
 */
export async function initializeProviders(
  config: ProviderFactoryConfig
): Promise<{
  ai: Record<string, AIProvider>;
  email: Record<string, EmailProvider>;
  stripe?: StripeProvider;
  supabase?: typeof supabaseProvider;
}> {
  const providers: {
    ai: Record<string, AIProvider>;
    email: Record<string, EmailProvider>;
    stripe?: StripeProvider;
    supabase?: typeof supabaseProvider;
  } = {
    ai: {},
    email: {},
  };

  try {
    logger.info("Initializing all providers");

    // Initialize AI providers
    if (config.gemini) {
      const geminiProvider = await createAIProvider("gemini", config);
      providers.ai.gemini = geminiProvider;
      aiProviderManager.registerProvider("gemini", geminiProvider);
    }

    // Initialize email providers
    if (config.gmail) {
      const gmailProvider = await createEmailProvider("gmail", config);
      providers.email.gmail = gmailProvider;
      emailProviderManager.registerProvider("gmail", gmailProvider);
    }

    // Initialize Stripe
    if (config.stripe) {
      const stripeProvider = await createStripeProvider(config);
      providers.stripe = stripeProvider;
    }

    // Initialize Supabase
    if (config.supabase) {
      const supabaseProvider = await createSupabaseProvider(config);
      providers.supabase = supabaseProvider;
    }

    logger.info("All providers initialized successfully", {
      aiProviders: Object.keys(providers.ai),
      emailProviders: Object.keys(providers.email),
      hasStripe: !!providers.stripe,
      hasSupabase: !!providers.supabase,
    });

    return providers;
  } catch (error) {
    logger.error("Failed to initialize providers", {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Get configuration from environment variables
 */
export function getConfigFromEnv(): ProviderFactoryConfig {
  const config: ProviderFactoryConfig = {};

  // Gemini configuration
  if (process.env.GEMINI_API_KEY) {
    config.gemini = {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
      maxTokens: process.env.GEMINI_MAX_TOKENS
        ? parseInt(process.env.GEMINI_MAX_TOKENS)
        : undefined,
    };
  }

  // Gmail configuration
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    config.gmail = {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      redirectUri:
        process.env.GMAIL_REDIRECT_URI ||
        "http://localhost:3000/api/auth/callback/google",
      scopes: process.env.GMAIL_SCOPES
        ? process.env.GMAIL_SCOPES.split(",")
        : undefined,
    };
  }

  // Supabase configuration
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    config.supabase = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  // Stripe configuration
  if (process.env.STRIPE_SECRET_KEY) {
    config.stripe = {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      apiVersion: process.env.STRIPE_API_VERSION,
    };
  }

  return config;
}

/**
 * Initialize providers from environment configuration
 */
export async function initializeProvidersFromEnv() {
  const config = getConfigFromEnv();
  return initializeProviders(config);
}

// Export provider managers for direct access
export { aiProviderManager, emailProviderManager };
