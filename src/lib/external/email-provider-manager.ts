/**
 * @fileoverview Email Provider Manager for MailPilot AI
 * @description Manages multiple email providers and provides unified interface
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import type {
  EmailProvider,
  EmailMessage,
  EmailThread,
  EmailSyncResult,
} from "./types/email-types";

import { logger, measureAsync } from "../logging";
import { ExternalServiceError } from "../errors";

/**
 * Email Provider Manager class
 * @description Manages registration and usage of multiple email providers
 */
export class EmailProviderManager {
  /** Map of registered email providers */
  private providers: Map<string, EmailProvider> = new Map();

  /** Default provider identifier */
  private defaultProvider?: string;

  /**
   * Creates a new Email Provider Manager instance
   */
  constructor() {
    this.providers = new Map();
  }

  /**
   * Register an email provider with a unique identifier
   * @param providerId - Unique identifier for the provider
   * @param provider - Email provider instance to register
   * @throws {ExternalServiceError} If provider registration fails
   */
  registerProvider(providerId: string, provider: EmailProvider): void {
    this.providers.set(providerId, provider);
    logger.info(`Email provider registered: ${providerId}`);

    // Set as default if it's the first provider
    if (!this.defaultProvider) {
      this.defaultProvider = providerId;
      logger.info(`Set default email provider: ${providerId}`);
    }
  }

  /**
   * Set the default email provider
   * @param providerId - Provider ID to set as default
   * @throws {ExternalServiceError} If provider not found
   */
  setDefaultProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "email-provider-manager",
        message: `Email provider not found: ${providerId}`,
        context: { providerId, operation: "setDefaultProvider" },
      });
    }
    this.defaultProvider = providerId;
    logger.info(`Default email provider changed to: ${providerId}`);
  }

  /**
   * Get a specific email provider by ID
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns Email provider instance
   * @throws {ExternalServiceError} If provider not found or no default set
   */
  getProvider(providerId?: string): EmailProvider {
    const targetId = providerId || this.defaultProvider;

    if (!targetId) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "email-provider-manager",
        message: "No email provider specified and no default provider set",
        context: { operation: "getProvider" },
      });
    }

    const provider = this.providers.get(targetId);
    if (!provider) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "email-provider-manager",
        message: `Email provider not found: ${targetId}`,
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
   * Sync emails using the specified or default provider
   * @param folderId - Optional folder ID to sync, syncs all if not specified
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns Email sync results with statistics
   * @throws {ExternalServiceError} If sync fails
   */
  async syncEmails(
    folderId?: string,
    providerId?: string
  ): Promise<EmailSyncResult> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Starting email sync", {
        providerId: providerId || this.defaultProvider,
        folderId,
      });

      const result = await provider.syncMessages({ folderId });

      logger.info("Email sync completed", {
        providerId: providerId || this.defaultProvider,
        messagesAdded: result.stats.messagesAdded,
        messagesUpdated: result.stats.messagesUpdated,
        messagesDeleted: result.stats.messagesDeleted,
      });

      return result;
    } catch (error) {
      logger.error("Email sync failed", {
        providerId: providerId || this.defaultProvider,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get emails using the specified or default provider
   * @param folderId - Folder ID to get emails from
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns Array of email messages
   * @throws {ExternalServiceError} If fetching fails
   */
  async getEmails(
    folderId: string,
    providerId?: string
  ): Promise<EmailMessage[]> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Fetching emails", {
        providerId: providerId || this.defaultProvider,
        folderId,
      });

      const result = await provider.listMessages(folderId);

      logger.info("Emails fetched successfully", {
        providerId: providerId || this.defaultProvider,
        count: result.messages.length,
      });

      return result.messages;
    } catch (error) {
      logger.error("Email fetching failed", {
        providerId: providerId || this.defaultProvider,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Get a specific email by ID using the specified or default provider
   * @param messageId - Email message ID to fetch
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns Email message or null if not found
   */
  async getEmail(
    messageId: string,
    providerId?: string
  ): Promise<EmailMessage | null> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Fetching email by ID", {
        providerId: providerId || this.defaultProvider,
        messageId,
      });

      const result = await provider.getMessage(messageId);

      logger.info("Email fetched by ID", {
        providerId: providerId || this.defaultProvider,
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error("Email fetch by ID failed", {
        providerId: providerId || this.defaultProvider,
        messageId,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Get email thread using the specified or default provider
   * @param threadId - Email thread ID to fetch
   * @param providerId - Optional provider ID, uses default if not specified
   * @returns Email thread or null if not found
   * @throws {ExternalServiceError} If fetching fails
   */
  async getThread(
    threadId: string,
    providerId?: string
  ): Promise<EmailThread | null> {
    const provider = this.getProvider(providerId);

    try {
      logger.info("Fetching thread by ID", {
        providerId: providerId || this.defaultProvider,
        threadId,
      });

      const result = await provider.getThread(threadId);

      logger.info("Thread fetched by ID", {
        providerId: providerId || this.defaultProvider,
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error("Thread fetch by ID failed", {
        providerId: providerId || this.defaultProvider,
        threadId,
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

      // Basic health check - use the built-in health check method
      return await provider.healthCheck();
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
      logger.info(`Email provider unregistered: ${providerId}`);

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

  /**
   * Get connection status for all providers
   * @returns Record mapping provider IDs to their health status
   */
  async getProvidersStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const providerId of this.listProviders()) {
      status[providerId] = await this.checkProviderHealth(providerId);
    }

    return status;
  }
}

/**
 * Singleton instance of Email Provider Manager
 * @description Ready-to-use instance for managing email providers
 */
export const emailProviderManager = new EmailProviderManager();
