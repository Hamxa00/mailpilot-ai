/**
 * External Services Module
 *
 * This module provides scalable integrations with external services including:
 * - AI providers (Google Gemini)
 * - Email providers (Gmail API)
 * - Payment processing (Stripe)
 * - Real-time services (Supabase)
 *
 * The provider pattern architecture allows for easy addition of new services
 * while maintaining consistent interfaces and error handling.
 */

// Type definitions
export * from "./types/ai-types";
export * from "./types/email-types";
export * from "./types/stripe-types";

// AI Providers
export { GeminiProvider } from "./gemini";

// Email Providers
export { GmailProvider } from "./email-providers";

// Payment Providers
export { StripeProviderImpl as StripeProvider } from "./stripe";

// Supabase Integration
export { supabaseProvider } from "./supabase";

// Provider Managers
export { AIProviderManager, aiProviderManager } from "./ai-provider-manager";
export {
  EmailProviderManager,
  emailProviderManager,
} from "./email-provider-manager";
export {
  StripeProviderManager,
  stripeProviderManager,
} from "./stripe-provider-manager";

// Provider Factory
export {
  createAIProvider,
  createEmailProvider,
  createStripeProvider,
  createSupabaseProvider,
  initializeProviders,
  initializeProvidersFromEnv,
  getConfigFromEnv,
  type ProviderFactoryConfig,
} from "./provider-factory";

// Utility functions for quick access
export {
  getUserProfile,
  updateUserMetadata,
  checkUserPermission,
} from "./supabase";

