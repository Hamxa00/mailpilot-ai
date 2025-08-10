/**
 * @fileoverview Stripe payment provider implementation
 * @description Stripe integration for billing, subscriptions, and usage tracking
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import Stripe from "stripe";
import { logger } from "../logging";
import { measureAsync } from "../logging/log-utilities";
import { ExternalServiceError, ValidationError } from "../errors";
import type {
  StripeProvider,
  StripeProviderConfig,
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
  SubscriptionStatus,
} from "./types/stripe-types";

/**
 * Stripe provider implementation
 * @description Handles all Stripe billing and subscription operations
 */
export class StripeProviderImpl implements StripeProvider {
  public readonly type = "stripe" as const;
  public readonly config: StripeProviderConfig;

  private stripe: Stripe | null = null;
  private initialized = false;

  /**
   * Creates a new Stripe provider instance
   * @param config - Stripe provider configuration
   */
  constructor(config: StripeProviderConfig) {
    this.config = {
      apiVersion: "2023-10-16",
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Initialize the Stripe provider
   * @throws {ValidationError} If API key is missing
   * @throws {ExternalServiceError} If initialization fails
   */
  public async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      if (!this.config.secretKey) {
        throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
          message: "Stripe secret key is required",
          context: { field: "secretKey" },
        });
      }

      this.stripe = new Stripe(this.config.secretKey, {
        apiVersion: this.config.apiVersion as any,
        timeout: this.config.timeout,
        telemetry: false, // Disable telemetry for privacy
      });

      this.initialized = true;
      logger.info("Stripe provider initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Stripe provider", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Check if Stripe service is healthy
   * @returns True if service is healthy, false otherwise
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized || !this.stripe) {
        await this.initialize();
      }

      // Simple health check by fetching account info
      await this.stripe!.accounts.retrieve();
      return true;
    } catch (error) {
      logger.warn("Stripe health check failed", {
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
  public async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Customer> {
    return measureAsync("stripe_create_customer", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const customer = await this.stripe!.customers.create({
          email,
          name,
          metadata,
        });

        logger.info("Stripe customer created", {
          customerId: customer.id,
          email,
        });

        return {
          id: customer.id,
          email: customer.email!,
          name: customer.name || undefined,
          metadata: customer.metadata,
          created: new Date(customer.created * 1000),
        };
      } catch (error) {
        logger.error("Failed to create Stripe customer", {
          email,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to create customer",
          context: { email, operation: "createCustomer" },
        });
      }
    });
  }

  /**
   * Get customer by ID
   * @param customerId - Stripe customer ID
   * @returns Customer information or null if not found
   */
  public async getCustomer(customerId: string): Promise<Customer | null> {
    return measureAsync("stripe_get_customer", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const customer = await this.stripe!.customers.retrieve(customerId);

        if (customer.deleted) {
          return null;
        }

        return {
          id: customer.id,
          email: customer.email!,
          name: customer.name || undefined,
          metadata: customer.metadata,
          created: new Date(customer.created * 1000),
        };
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeError &&
          error.code === "resource_missing"
        ) {
          return null;
        }

        logger.error("Failed to get Stripe customer", {
          customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to retrieve customer",
          context: { customerId, operation: "getCustomer" },
        });
      }
    });
  }

  /**
   * Update customer information
   * @param customerId - Customer ID to update
   * @param updates - Fields to update
   * @returns Updated customer information
   * @throws {ExternalServiceError} If update fails
   */
  public async updateCustomer(
    customerId: string,
    updates: Partial<Customer>
  ): Promise<Customer> {
    return measureAsync("stripe_update_customer", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const customer = await this.stripe!.customers.update(customerId, {
          email: updates.email,
          name: updates.name,
          metadata: updates.metadata,
        });

        logger.info("Stripe customer updated", { customerId });

        return {
          id: customer.id,
          email: customer.email!,
          name: customer.name || undefined,
          metadata: customer.metadata,
          created: new Date(customer.created * 1000),
        };
      } catch (error) {
        logger.error("Failed to update Stripe customer", {
          customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to update customer",
          context: { customerId, operation: "updateCustomer" },
        });
      }
    });
  }

  /**
   * Create a checkout session
   * @param config - Checkout session configuration
   * @returns Created checkout session
   * @throws {ExternalServiceError} If session creation fails
   */
  public async createCheckoutSession(
    config: CheckoutSessionConfig
  ): Promise<CheckoutSession> {
    return measureAsync("stripe_create_checkout_session", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: config.priceId,
              quantity: 1,
            },
          ],
          success_url: config.successUrl,
          cancel_url: config.cancelUrl,
          customer_email: config.customerEmail,
          metadata: config.metadata,
          allow_promotion_codes: config.allowPromotionCodes,
        };

        if (config.customerId) {
          sessionConfig.customer = config.customerId;
          delete sessionConfig.customer_email;
        }

        if (config.trialPeriodDays) {
          sessionConfig.subscription_data = {
            trial_period_days: config.trialPeriodDays,
          };
        }

        const session = await this.stripe!.checkout.sessions.create(
          sessionConfig
        );

        logger.info("Stripe checkout session created", {
          sessionId: session.id,
          customerEmail: config.customerEmail,
        });

        return {
          id: session.id,
          url: session.url!,
          status: session.status!,
          paymentStatus: session.payment_status,
        };
      } catch (error) {
        logger.error("Failed to create checkout session", {
          priceId: config.priceId,
          customerEmail: config.customerEmail,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to create checkout session",
          context: { config, operation: "createCheckoutSession" },
        });
      }
    });
  }

  /**
   * Create billing portal session
   * @param config - Billing portal configuration
   * @returns Created billing portal session
   * @throws {ExternalServiceError} If session creation fails
   */
  public async createBillingPortalSession(
    config: BillingPortalConfig
  ): Promise<BillingPortalSession> {
    return measureAsync("stripe_create_billing_portal", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const session = await this.stripe!.billingPortal.sessions.create({
          customer: config.customerId,
          return_url: config.returnUrl,
        });

        logger.info("Stripe billing portal session created", {
          customerId: config.customerId,
        });

        return {
          url: session.url,
        };
      } catch (error) {
        logger.error("Failed to create billing portal session", {
          customerId: config.customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          context: {
            config,
            operation: "createBillingPortalSession",
          },
          message: "Failed to create billing portal session",
        });
      }
    });
  }

  /**
   * Get subscription by ID
   * @param subscriptionId - Subscription ID
   * @returns Subscription information or null if not found
   */
  public async getSubscription(
    subscriptionId: string
  ): Promise<Subscription | null> {
    return measureAsync("stripe_get_subscription", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const subscription = await this.stripe!.subscriptions.retrieve(
          subscriptionId
        );

        return this.mapStripeSubscription(subscription);
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeError &&
          error.code === "resource_missing"
        ) {
          return null;
        }

        logger.error("Failed to get subscription", {
          subscriptionId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to retrieve subscription",
          context: { subscriptionId, operation: "getSubscription" },
        });
      }
    });
  }

  /**
   * Get customer's active subscription
   * @param customerId - Customer ID
   * @returns Active subscription or null if none found
   */
  public async getCustomerSubscription(
    customerId: string
  ): Promise<Subscription | null> {
    return measureAsync("stripe_get_customer_subscription", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const subscriptions = await this.stripe!.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          return null;
        }

        return this.mapStripeSubscription(subscriptions.data[0]);
      } catch (error) {
        logger.error("Failed to get customer subscription", {
          customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to retrieve customer subscription",
          context: { customerId, operation: "getCustomerSubscription" },
        });
      }
    });
  }

  /**
   * Cancel subscription
   * @param subscriptionId - Subscription ID to cancel
   * @param cancelAtPeriodEnd - Whether to cancel at period end (default: true)
   * @returns Updated subscription
   * @throws {ExternalServiceError} If cancellation fails
   */
  public async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    return measureAsync("stripe_cancel_subscription", async () => {
      try {
        if (!this.stripe) await this.initialize();

        let subscription: Stripe.Subscription;

        if (cancelAtPeriodEnd) {
          subscription = await this.stripe!.subscriptions.update(
            subscriptionId,
            {
              cancel_at_period_end: true,
            }
          );
        } else {
          subscription = await this.stripe!.subscriptions.cancel(
            subscriptionId
          );
        }

        logger.info("Subscription cancelled", {
          subscriptionId,
          cancelAtPeriodEnd,
        });

        return this.mapStripeSubscription(subscription);
      } catch (error) {
        logger.error("Failed to cancel subscription", {
          subscriptionId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to cancel subscription",
          context: { subscriptionId, operation: "cancelSubscription" },
        });
      }
    });
  }

  /**
   * Resume subscription
   * @param subscriptionId - Subscription ID to resume
   * @returns Updated subscription
   * @throws {ExternalServiceError} If resumption fails
   */
  public async resumeSubscription(
    subscriptionId: string
  ): Promise<Subscription> {
    return measureAsync("stripe_resume_subscription", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const subscription = await this.stripe!.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end: false,
          }
        );

        logger.info("Subscription resumed", { subscriptionId });

        return this.mapStripeSubscription(subscription);
      } catch (error) {
        logger.error("Failed to resume subscription", {
          subscriptionId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to resume subscription",
          context: { subscriptionId, operation: "resumeSubscription" },
        });
      }
    });
  }

  /**
   * Record usage for metered billing
   * @param record - Usage record to submit
   * @throws {ExternalServiceError} If usage recording fails
   */
  public async recordUsage(record: UsageRecord): Promise<void> {
    return measureAsync("stripe_record_usage", async () => {
      try {
        if (!this.stripe) await this.initialize();

        // Create usage record using the Stripe SDK
        // Note: TypeScript definitions may not include this method, but it exists in the API
        const usageRecord = await (
          this.stripe!.subscriptionItems as any
        ).createUsageRecord(record.subscriptionItemId, {
          quantity: record.quantity,
          timestamp: Math.floor(record.timestamp.getTime() / 1000),
          action: record.action || "increment",
        });

        logger.info("Usage recorded", {
          subscriptionItemId: record.subscriptionItemId,
          quantity: record.quantity,
          usageRecordId: usageRecord.id,
        });
      } catch (error) {
        logger.error("Failed to record usage", {
          record,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to record usage",
          context: { record, operation: "recordUsage" },
        });
      }
    });
  }

  /**
   * Get usage summary for customer
   * @param customerId - Customer ID
   * @returns Usage summary or null if no subscription
   */
  public async getUsageSummary(
    customerId: string
  ): Promise<UsageSummary | null> {
    return measureAsync("stripe_get_usage_summary", async () => {
      try {
        const subscription = await this.getCustomerSubscription(customerId);
        if (!subscription) {
          return null;
        }

        // Import database connection
        const dbModule = await import("../database/database-connection");
        const { usageMetric, user } = await import("../../db/schema");
        const { eq, and, gte, lte, sum } = await import("drizzle-orm");
        const db = dbModule.getDatabase();

        // Find user by customer ID
        const userRecord = await db
          .select()
          .from(user)
          .leftJoin(usageMetric, eq(usageMetric.userId, user.id))
          .where(eq(user.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (!userRecord.length) {
          logger.warn("User not found for Stripe customer", { customerId });
          return null;
        }

        const userId = userRecord[0].user.id;

        // Get current period usage
        const currentPeriodUsage = await db
          .select({
            metricType: usageMetric.metricType,
            totalValue: sum(usageMetric.value),
          })
          .from(usageMetric)
          .where(
            and(
              eq(usageMetric.userId, userId),
              gte(usageMetric.periodStart, subscription.currentPeriodStart),
              lte(usageMetric.periodEnd, subscription.currentPeriodEnd)
            )
          )
          .groupBy(usageMetric.metricType);

        // Convert to usage summary format
        const usage = {
          emailsProcessed: 0,
          aiSummariesGenerated: 0,
          chatbotQueries: 0,
          apiCalls: 0,
        };

        currentPeriodUsage.forEach(
          (metric: {
            metricType: string | null;
            totalValue: string | null;
          }) => {
            const value = Number(metric.totalValue) || 0;
            switch (metric.metricType) {
              case "emails_processed":
                usage.emailsProcessed = value;
                break;
              case "ai_summaries_generated":
                usage.aiSummariesGenerated = value;
                break;
              case "chatbot_queries":
                usage.chatbotQueries = value;
                break;
              case "api_calls":
                usage.apiCalls = value;
                break;
            }
          }
        );

        return {
          subscriptionId: subscription.id,
          currentPeriodUsage: usage,
          limits: {
            emailsProcessed: this.getPlanLimits(subscription.plan)
              .emailsProcessed,
            aiSummariesGenerated: this.getPlanLimits(subscription.plan)
              .aiSummariesGenerated,
            chatbotQueries: this.getPlanLimits(subscription.plan)
              .chatbotQueries,
            apiCalls: this.getPlanLimits(subscription.plan).apiCalls,
          },
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
        };
      } catch (error) {
        logger.error("Failed to get usage summary", {
          customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to get usage summary",
          context: { customerId, operation: "getUsageSummary" },
        });
      }
    });
  }

  /**
   * List customer's invoices
   * @param customerId - Customer ID
   * @param limit - Maximum number of invoices to retrieve
   * @returns Array of invoices
   */
  public async listInvoices(
    customerId: string,
    limit: number = 10
  ): Promise<Invoice[]> {
    return measureAsync("stripe_list_invoices", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const invoices = await this.stripe!.invoices.list({
          customer: customerId,
          limit,
        });

        return invoices.data.map((invoice) => ({
          id: invoice.id!,
          customerId: invoice.customer as string,
          subscriptionId:
            ((invoice as any).subscription as string) || undefined,
          status: invoice.status!,
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          created: new Date(invoice.created * 1000),
          dueDate: invoice.due_date
            ? new Date(invoice.due_date * 1000)
            : undefined,
          invoiceUrl: invoice.invoice_pdf || undefined,
        }));
      } catch (error) {
        logger.error("Failed to list invoices", {
          customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to list invoices",
          context: { customerId, operation: "listInvoices" },
        });
      }
    });
  }

  /**
   * Get customer's payment methods
   * @param customerId - Customer ID
   * @returns Array of payment methods
   */
  public async listPaymentMethods(
    customerId: string
  ): Promise<PaymentMethod[]> {
    return measureAsync("stripe_list_payment_methods", async () => {
      try {
        if (!this.stripe) await this.initialize();

        const paymentMethods = await this.stripe!.paymentMethods.list({
          customer: customerId,
          type: "card",
        });

        return paymentMethods.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card
            ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              }
            : undefined,
          customerId,
        }));
      } catch (error) {
        logger.error("Failed to list payment methods", {
          customerId,
          error: error instanceof Error ? error.message : error,
        });

        throw new ExternalServiceError("EXT_STRIPE_API_ERROR", {
          service: "stripe",
          message: "Failed to list payment methods",
          context: { customerId, operation: "listPaymentMethods" },
        });
      }
    });
  }

  /**
   * Verify webhook signature
   * @param payload - Webhook payload
   * @param signature - Stripe signature header
   * @returns Parsed webhook event
   * @throws {ValidationError} If signature verification fails
   */
  public verifyWebhook(payload: string, signature: string): WebhookEvent {
    try {
      if (!this.stripe) throw new Error("Stripe not initialized");
      if (!this.config.webhookSecret) {
        throw new ValidationError("VALIDATION_MISSING_REQUIRED_FIELD", {
          message: "Webhook secret is required for signature verification",
          context: { field: "webhookSecret" },
        });
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: new Date(event.created * 1000),
        apiVersion: event.api_version || "2023-10-16",
      };
    } catch (error) {
      logger.error("Webhook signature verification failed", {
        error: error instanceof Error ? error.message : error,
      });

      throw new ValidationError("VALIDATION_INVALID_INPUT", {
        message: "Invalid webhook signature",
        context: { operation: "verifyWebhook" },
      });
    }
  }

  /**
   * Handle webhook event
   * @param event - Verified webhook event
   */
  public async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    logger.info("Handling Stripe webhook event", {
      eventId: event.id,
      eventType: event.type,
    });

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await this.handleSubscriptionEvent(event);
          break;

        case "invoice.payment_succeeded":
        case "invoice.payment_failed":
          await this.handleInvoiceEvent(event);
          break;

        default:
          logger.info("Unhandled webhook event type", {
            eventType: event.type,
          });
      }
    } catch (error) {
      logger.error("Failed to handle webhook event", {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Map Stripe subscription to our subscription type
   * @private
   */
  private mapStripeSubscription(
    subscription: Stripe.Subscription
  ): Subscription {
    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status as SubscriptionStatus,
      plan: this.mapPriceToPlan(subscription.items.data[0]?.price.id || ""),
      priceId: subscription.items.data[0]?.price.id || "",
      currentPeriodStart: new Date(
        (subscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000
      ),
      created: new Date(subscription.created * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      metadata: subscription.metadata,
    };
  }

  /**
   * Map price ID to plan type
   * @private
   */
  private mapPriceToPlan(priceId: string): "free" | "pro" | "enterprise" {
    // Map based on environment variables or configuration
    const priceMappings = {
      [process.env.STRIPE_PRICE_ID_FREE || ""]: "free" as const,
      [process.env.STRIPE_PRICE_ID_PRO || ""]: "pro" as const,
      [process.env.STRIPE_PRICE_ID_ENTERPRISE || ""]: "enterprise" as const,
    };

    const plan = priceMappings[priceId];
    if (plan) {
      return plan;
    }

    // Fallback to string matching if environment variables not set
    const lowerPriceId = priceId.toLowerCase();
    if (lowerPriceId.includes("enterprise")) return "enterprise";
    if (lowerPriceId.includes("pro") || lowerPriceId.includes("premium"))
      return "pro";

    logger.warn("Unknown price ID, defaulting to free plan", { priceId });
    return "free";
  }

  /**
   * Get plan limits
   * @private
   */
  private getPlanLimits(plan: "free" | "pro" | "enterprise") {
    const limits = {
      free: {
        emailsProcessed: 100,
        aiSummariesGenerated: 20,
        chatbotQueries: 10,
        apiCalls: 1000,
      },
      pro: {
        emailsProcessed: 10000,
        aiSummariesGenerated: 2000,
        chatbotQueries: 500,
        apiCalls: 50000,
      },
      enterprise: {
        emailsProcessed: null, // Unlimited
        aiSummariesGenerated: null,
        chatbotQueries: null,
        apiCalls: null,
      },
    };

    return limits[plan];
  }

  /**
   * Handle subscription webhook events
   * @private
   */
  private async handleSubscriptionEvent(event: WebhookEvent): Promise<void> {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const dbModule = await import("../database/database-connection");
      const { stripeSubscription, user } = await import("../../db/schema");
      const { eq } = await import("drizzle-orm");
      const db = dbModule.getDatabase();

      // Find existing subscription record
      const existingSubscription = await db
        .select()
        .from(stripeSubscription)
        .where(eq(stripeSubscription.subscriptionId, subscription.id))
        .limit(1);

      const subscriptionData = {
        subscriptionId: subscription.id,
        productId: subscription.items.data[0]?.price.product as string,
        priceId: subscription.items.data[0]?.price.id,
        customerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        canceledAt: (subscription as any).canceled_at
          ? new Date((subscription as any).canceled_at * 1000)
          : null,
        trialStart: (subscription as any).trial_start
          ? new Date((subscription as any).trial_start * 1000)
          : null,
        trialEnd: (subscription as any).trial_end
          ? new Date((subscription as any).trial_end * 1000)
          : null,
        amount: subscription.items.data[0]?.price.unit_amount?.toString(),
        currency: subscription.currency,
        interval: subscription.items.data[0]?.price.recurring?.interval,
        intervalCount:
          subscription.items.data[0]?.price.recurring?.interval_count?.toString(),
        metadata: subscription.metadata,
        updatedAt: new Date(),
      };

      if (existingSubscription.length > 0) {
        // Update existing subscription
        await db
          .update(stripeSubscription)
          .set(subscriptionData)
          .where(eq(stripeSubscription.subscriptionId, subscription.id));
      } else {
        // Find user by customer ID to create new subscription
        const userRecord = await db
          .select()
          .from(user)
          .where(eq(user.emailAddress, subscription.customer as string))
          .limit(1);

        if (userRecord.length > 0) {
          await db.insert(stripeSubscription).values({
            ...subscriptionData,
            userId: userRecord[0].id,
          });

          // Update user with subscription ID
          await db
            .update(user)
            .set({ stripeSubscriptionId: subscription.id })
            .where(eq(user.id, userRecord[0].id));
        }
      }

      logger.info("Subscription event handled", {
        eventType: event.type,
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    } catch (error) {
      logger.error("Failed to handle subscription event", {
        eventType: event.type,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Handle invoice webhook events
   * @private
   */
  private async handleInvoiceEvent(event: WebhookEvent): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      const { databaseConnection } = await import(
        "../database/database-connection"
      );
      const { stripeSubscription, user, usageMetric } = await import(
        "../../db/schema"
      );
      const { eq, and } = await import("drizzle-orm");
      const db = databaseConnection.getDatabase();

      // Find subscription record
      const subscriptionRecord = await db
        .select()
        .from(stripeSubscription)
        .leftJoin(user, eq(user.id, stripeSubscription.userId))
        .where(
          eq(
            stripeSubscription.subscriptionId,
            ((invoice as any).subscription as string) || ""
          )
        )

        .limit(1);

      if (subscriptionRecord.length === 0) {
        logger.warn("Subscription not found for invoice", {
          invoiceId: invoice.id,
          subscriptionId: (invoice as any).subscription,
        });
        return;
      }

      const userId = subscriptionRecord[0].user?.id;
      if (!userId) {
        logger.warn("User not found for subscription", {
          subscriptionId: (invoice as any).subscription,
        });
        return;
      }

      if (event.type === "invoice.payment_succeeded") {
        // Payment successful - ensure user is active
        await db
          .update(user)
          .set({
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId));

        // Record successful payment metric
        await db.insert(usageMetric).values({
          userId,
          metricType: "payment_success",
          value: 1,
          metadata: {
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
          },
          periodStart: new Date((invoice.period_start as number) * 1000),
          periodEnd: new Date((invoice.period_end as number) * 1000),
        });

        logger.info("Payment succeeded - user activated", {
          userId,
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
        });
      } else if (event.type === "invoice.payment_failed") {
        // Payment failed - potentially deactivate user after grace period
        const failureCount = await db
          .select()
          .from(usageMetric)
          .where(
            and(
              eq(usageMetric.userId, userId),
              eq(usageMetric.metricType, "payment_failure")
            )
          );

        // Record payment failure
        await db.insert(usageMetric).values({
          userId,
          metricType: "payment_failure",
          value: 1,
          metadata: {
            invoiceId: invoice.id,
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt,
          },
          periodStart: new Date((invoice.period_start as number) * 1000),
          periodEnd: new Date((invoice.period_end as number) * 1000),
        });

        // Deactivate user if too many failures (configurable threshold)
        if (failureCount.length >= 2) {
          await db
            .update(user)
            .set({
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(user.id, userId));

          logger.warn("User deactivated due to payment failures", {
            userId,
            failureCount: failureCount.length + 1,
          });
        }

        logger.warn("Payment failed", {
          userId,
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
        });
      }

      logger.info("Invoice event handled", {
        eventType: event.type,
        invoiceId: invoice.id,
        userId,
      });
    } catch (error) {
      logger.error("Failed to handle invoice event", {
        eventType: event.type,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}
