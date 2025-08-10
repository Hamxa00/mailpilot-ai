/**
 * @fileoverview Stripe Provider Manager for MailPilot AI
 * @description Manages Stripe billing and payment operations
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { logger, measureAsync } from "../logging";
import { ExternalServiceError } from "../errors";
import type {
  StripeProvider,
  Customer,
  Subscription,
  CheckoutSession,
  CheckoutSessionConfig,
  BillingPortalSession,
  BillingPortalConfig,
  UsageRecord,
  UsageSummary,
  Invoice,
  PaymentMethod,
  WebhookEvent,
} from "./types/stripe-types";

/**
 * Stripe Provider Manager class
 * @description Manages Stripe provider and provides unified billing interface
 */
export class StripeProviderManager {
  /** Stripe provider instance */
  private provider: StripeProvider | null = null;

  /**
   * Creates a new Stripe Provider Manager instance
   */
  constructor() {}

  /**
   * Register a Stripe provider
   * @param provider - Stripe provider instance to register
   * @throws {ExternalServiceError} If provider registration fails
   */
  registerProvider(provider: StripeProvider): void {
    this.provider = provider;
    logger.info("Stripe provider registered");
  }

  /**
   * Get the registered provider
   * @returns Stripe provider instance
   * @throws {ExternalServiceError} If no provider is registered
   */
  getProvider(): StripeProvider {
    if (!this.provider) {
      throw new ExternalServiceError("EXT_SERVICE_UNAVAILABLE", {
        service: "stripe-provider-manager",
        message: "No Stripe provider registered",
        context: { operation: "getProvider" },
      });
    }
    return this.provider;
  }

  /**
   * Check if Stripe provider is healthy
   * @returns True if provider is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.provider) return false;
      return await this.provider.healthCheck();
    } catch (error) {
      logger.error("Stripe provider health check failed", {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Create a new customer
   * @param email - Customer email
   * @param name - Customer name (optional)
   * @param metadata - Additional metadata (optional)
   * @returns Created customer information
   * @throws {ExternalServiceError} If customer creation fails
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Customer> {
    return measureAsync("stripe_manager_create_customer", async () => {
      const provider = this.getProvider();

      try {
        logger.info("Creating Stripe customer", { email, name });

        const customer = await provider.createCustomer(email, name, metadata);

        logger.info("Stripe customer created successfully", {
          customerId: customer.id,
          email: customer.email,
        });

        return customer;
      } catch (error) {
        logger.error("Failed to create Stripe customer", {
          email,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Get customer by ID
   * @param customerId - Stripe customer ID
   * @returns Customer information or null if not found
   */
  async getCustomer(customerId: string): Promise<Customer | null> {
    return measureAsync("stripe_manager_get_customer", async () => {
      const provider = this.getProvider();
      return provider.getCustomer(customerId);
    });
  }

  /**
   * Update customer information
   * @param customerId - Customer ID to update
   * @param updates - Fields to update
   * @returns Updated customer information
   * @throws {ExternalServiceError} If update fails
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<Customer>
  ): Promise<Customer> {
    return measureAsync("stripe_manager_update_customer", async () => {
      const provider = this.getProvider();
      return provider.updateCustomer(customerId, updates);
    });
  }

  /**
   * Create a checkout session
   * @param config - Checkout session configuration
   * @returns Created checkout session
   * @throws {ExternalServiceError} If session creation fails
   */
  async createCheckoutSession(config: CheckoutSessionConfig): Promise<CheckoutSession> {
    return measureAsync("stripe_manager_create_checkout", async () => {
      const provider = this.getProvider();

      try {
        logger.info("Creating Stripe checkout session", {
          priceId: config.priceId,
          customerEmail: config.customerEmail,
        });

        const session = await provider.createCheckoutSession(config);

        logger.info("Stripe checkout session created", {
          sessionId: session.id,
          url: session.url,
        });

        return session;
      } catch (error) {
        logger.error("Failed to create checkout session", {
          config,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Create billing portal session
   * @param config - Billing portal configuration
   * @returns Created billing portal session
   * @throws {ExternalServiceError} If session creation fails
   */
  async createBillingPortalSession(
    config: BillingPortalConfig
  ): Promise<BillingPortalSession> {
    return measureAsync("stripe_manager_create_billing_portal", async () => {
      const provider = this.getProvider();
      return provider.createBillingPortalSession(config);
    });
  }

  /**
   * Get subscription by ID
   * @param subscriptionId - Subscription ID
   * @returns Subscription information or null if not found
   */
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return measureAsync("stripe_manager_get_subscription", async () => {
      const provider = this.getProvider();
      return provider.getSubscription(subscriptionId);
    });
  }

  /**
   * Get customer's active subscription
   * @param customerId - Customer ID
   * @returns Active subscription or null if none found
   */
  async getCustomerSubscription(customerId: string): Promise<Subscription | null> {
    return measureAsync("stripe_manager_get_customer_subscription", async () => {
      const provider = this.getProvider();
      return provider.getCustomerSubscription(customerId);
    });
  }

  /**
   * Cancel subscription
   * @param subscriptionId - Subscription ID to cancel
   * @param cancelAtPeriodEnd - Whether to cancel at period end (default: true)
   * @returns Updated subscription
   * @throws {ExternalServiceError} If cancellation fails
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    return measureAsync("stripe_manager_cancel_subscription", async () => {
      const provider = this.getProvider();

      try {
        logger.info("Cancelling Stripe subscription", {
          subscriptionId,
          cancelAtPeriodEnd,
        });

        const subscription = await provider.cancelSubscription(
          subscriptionId,
          cancelAtPeriodEnd
        );

        logger.info("Stripe subscription cancelled", {
          subscriptionId,
          status: subscription.status,
        });

        return subscription;
      } catch (error) {
        logger.error("Failed to cancel subscription", {
          subscriptionId,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Resume subscription
   * @param subscriptionId - Subscription ID to resume
   * @returns Updated subscription
   * @throws {ExternalServiceError} If resumption fails
   */
  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    return measureAsync("stripe_manager_resume_subscription", async () => {
      const provider = this.getProvider();
      return provider.resumeSubscription(subscriptionId);
    });
  }

  /**
   * Record usage for metered billing
   * @param record - Usage record to submit
   * @throws {ExternalServiceError} If usage recording fails
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    return measureAsync("stripe_manager_record_usage", async () => {
      const provider = this.getProvider();

      try {
        logger.info("Recording usage", {
          subscriptionItemId: record.subscriptionItemId,
          quantity: record.quantity,
        });

        await provider.recordUsage(record);

        logger.info("Usage recorded successfully", {
          subscriptionItemId: record.subscriptionItemId,
          quantity: record.quantity,
        });
      } catch (error) {
        logger.error("Failed to record usage", {
          record,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Get usage summary for customer
   * @param customerId - Customer ID
   * @returns Usage summary or null if no subscription
   */
  async getUsageSummary(customerId: string): Promise<UsageSummary | null> {
    return measureAsync("stripe_manager_get_usage_summary", async () => {
      const provider = this.getProvider();
      return provider.getUsageSummary(customerId);
    });
  }

  /**
   * List customer's invoices
   * @param customerId - Customer ID
   * @param limit - Maximum number of invoices to retrieve
   * @returns Array of invoices
   */
  async listInvoices(customerId: string, limit?: number): Promise<Invoice[]> {
    return measureAsync("stripe_manager_list_invoices", async () => {
      const provider = this.getProvider();
      return provider.listInvoices(customerId, limit);
    });
  }

  /**
   * Get customer's payment methods
   * @param customerId - Customer ID
   * @returns Array of payment methods
   */
  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return measureAsync("stripe_manager_list_payment_methods", async () => {
      const provider = this.getProvider();
      return provider.listPaymentMethods(customerId);
    });
  }

  /**
   * Verify webhook signature
   * @param payload - Webhook payload
   * @param signature - Stripe signature header
   * @returns Parsed webhook event
   * @throws {ValidationError} If signature verification fails
   */
  verifyWebhook(payload: string, signature: string): WebhookEvent {
    const provider = this.getProvider();
    return provider.verifyWebhook(payload, signature);
  }

  /**
   * Handle webhook event
   * @param event - Verified webhook event
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    return measureAsync("stripe_manager_handle_webhook", async () => {
      const provider = this.getProvider();

      try {
        logger.info("Handling Stripe webhook event", {
          eventId: event.id,
          eventType: event.type,
        });

        await provider.handleWebhookEvent(event);

        logger.info("Stripe webhook event handled successfully", {
          eventId: event.id,
          eventType: event.type,
        });
      } catch (error) {
        logger.error("Failed to handle webhook event", {
          eventId: event.id,
          eventType: event.type,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }

  /**
   * Batch record usage for multiple metrics
   * @param customerId - Customer ID
   * @param usage - Usage metrics to record
   * @throws {ExternalServiceError} If usage recording fails
   */
  async recordBatchUsage(
    customerId: string,
    usage: {
      emailsProcessed?: number;
      aiSummariesGenerated?: number;
      chatbotQueries?: number;
      apiCalls?: number;
    }
  ): Promise<void> {
    return measureAsync("stripe_manager_record_batch_usage", async () => {
      try {
        // Get customer's subscription to get subscription items
        const subscription = await this.getCustomerSubscription(customerId);
        if (!subscription) {
          logger.warn("No active subscription found for usage recording", {
            customerId,
          });
          return;
        }

        const timestamp = new Date();

        // Record each usage type (this would need to be configured based on your actual subscription items)
        const usagePromises: Promise<void>[] = [];

        if (usage.emailsProcessed) {
          usagePromises.push(
            this.recordUsage({
              subscriptionItemId: "emails_subscription_item_id", // Configure based on your setup
              quantity: usage.emailsProcessed,
              timestamp,
            })
          );
        }

        if (usage.aiSummariesGenerated) {
          usagePromises.push(
            this.recordUsage({
              subscriptionItemId: "ai_summaries_subscription_item_id", // Configure based on your setup
              quantity: usage.aiSummariesGenerated,
              timestamp,
            })
          );
        }

        if (usage.chatbotQueries) {
          usagePromises.push(
            this.recordUsage({
              subscriptionItemId: "chatbot_subscription_item_id", // Configure based on your setup
              quantity: usage.chatbotQueries,
              timestamp,
            })
          );
        }

        if (usage.apiCalls) {
          usagePromises.push(
            this.recordUsage({
              subscriptionItemId: "api_calls_subscription_item_id", // Configure based on your setup
              quantity: usage.apiCalls,
              timestamp,
            })
          );
        }

        await Promise.all(usagePromises);

        logger.info("Batch usage recorded successfully", {
          customerId,
          usage,
        });
      } catch (error) {
        logger.error("Failed to record batch usage", {
          customerId,
          usage,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }
    });
  }
}

/**
 * Singleton instance of Stripe Provider Manager
 * @description Ready-to-use instance for managing Stripe operations
 */
export const stripeProviderManager = new StripeProviderManager();
