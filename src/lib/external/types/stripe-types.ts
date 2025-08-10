/**
 * @fileoverview Stripe integration type definitions
 * @description Type definitions for Stripe billing and subscription services
 * @author MailPilot AI Team
 * @version 1.0.0
 */

/**
 * Stripe provider configuration
 */
export interface StripeProviderConfig {
  /** Stripe secret key */
  secretKey: string;

  /** Stripe webhook endpoint secret */
  webhookSecret?: string;

  /** API version to use */
  apiVersion?: string;

  /** Timeout for requests in milliseconds */
  timeout?: number;
}

/**
 * Subscription plan types
 */
export type SubscriptionPlan = "free" | "pro" | "enterprise";

/**
 * Subscription status types
 */
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "trialing"
  | "unpaid";

/**
 * Customer information
 */
export interface Customer {
  /** Stripe customer ID */
  id: string;

  /** Customer email */
  email: string;

  /** Customer name */
  name?: string;

  /** Customer metadata */
  metadata?: Record<string, string>;

  /** Customer creation date */
  created: Date;
}

/**
 * Subscription information
 */
export interface Subscription {
  /** Stripe subscription ID */
  id: string;

  /** Associated customer ID */
  customerId: string;

  /** Current subscription status */
  status: SubscriptionStatus;

  /** Current plan */
  plan: SubscriptionPlan;

  /** Price ID */
  priceId: string;

  /** Current period start */
  currentPeriodStart: Date;

  /** Current period end */
  currentPeriodEnd: Date;

  /** Subscription creation date */
  created: Date;

  /** Cancel at period end flag */
  cancelAtPeriodEnd: boolean;

  /** Subscription metadata */
  metadata?: Record<string, string>;
}

/**
 * Usage record for metered billing
 */
export interface UsageRecord {
  /** Subscription item ID */
  subscriptionItemId: string;

  /** Usage quantity */
  quantity: number;

  /** Timestamp of usage */
  timestamp: Date;

  /** Action type */
  action?: "set" | "increment";
}

/**
 * Checkout session configuration
 */
export interface CheckoutSessionConfig {
  /** Price ID to subscribe to */
  priceId: string;

  /** Customer email */
  customerEmail: string;

  /** Success URL after payment */
  successUrl: string;

  /** Cancel URL if user cancels */
  cancelUrl: string;

  /** Customer ID if existing customer */
  customerId?: string;

  /** Trial period days */
  trialPeriodDays?: number;

  /** Session metadata */
  metadata?: Record<string, string>;

  /** Allow promotion codes */
  allowPromotionCodes?: boolean;
}

/**
 * Checkout session result
 */
export interface CheckoutSession {
  /** Session ID */
  id: string;

  /** Checkout URL */
  url: string;

  /** Session status */
  status: string;

  /** Payment status */
  paymentStatus: string;
}

/**
 * Billing portal session configuration
 */
export interface BillingPortalConfig {
  /** Customer ID */
  customerId: string;

  /** Return URL after managing billing */
  returnUrl: string;
}

/**
 * Billing portal session result
 */
export interface BillingPortalSession {
  /** Session URL */
  url: string;
}

/**
 * Invoice information
 */
export interface Invoice {
  /** Invoice ID */
  id: string;

  /** Customer ID */
  customerId: string;

  /** Subscription ID */
  subscriptionId?: string;

  /** Invoice status */
  status: string;

  /** Amount due in cents */
  amountDue: number;

  /** Amount paid in cents */
  amountPaid: number;

  /** Currency */
  currency: string;

  /** Invoice creation date */
  created: Date;

  /** Due date */
  dueDate?: Date;

  /** Invoice URL */
  invoiceUrl?: string;
}

/**
 * Payment method information
 */
export interface PaymentMethod {
  /** Payment method ID */
  id: string;

  /** Type of payment method */
  type: string;

  /** Card details if type is card */
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };

  /** Customer ID */
  customerId: string;
}

/**
 * Webhook event data
 */
export interface WebhookEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type: string;

  /** Event data */
  data: {
    object: any;
    previousAttributes?: any;
  };

  /** Event creation timestamp */
  created: Date;

  /** API version */
  apiVersion: string;
}

/**
 * Usage summary for billing
 */
export interface UsageSummary {
  /** Subscription ID */
  subscriptionId: string;

  /** Current period usage */
  currentPeriodUsage: {
    emailsProcessed: number;
    aiSummariesGenerated: number;
    chatbotQueries: number;
    apiCalls: number;
  };

  /** Usage limits for current plan */
  limits: {
    emailsProcessed: number | null;
    aiSummariesGenerated: number | null;
    chatbotQueries: number | null;
    apiCalls: number | null;
  };

  /** Period start and end */
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Stripe provider interface
 */
export interface StripeProvider {
  /** Provider type */
  readonly type: "stripe";

  /** Provider configuration */
  readonly config: StripeProviderConfig;

  /**
   * Initialize the Stripe provider
   */
  initialize(): Promise<void>;

  /**
   * Check if Stripe service is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Create a new customer
   */
  createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Customer>;

  /**
   * Get customer by ID
   */
  getCustomer(customerId: string): Promise<Customer | null>;

  /**
   * Update customer information
   */
  updateCustomer(
    customerId: string,
    updates: Partial<Customer>
  ): Promise<Customer>;

  /**
   * Create a checkout session
   */
  createCheckoutSession(
    config: CheckoutSessionConfig
  ): Promise<CheckoutSession>;

  /**
   * Create billing portal session
   */
  createBillingPortalSession(
    config: BillingPortalConfig
  ): Promise<BillingPortalSession>;

  /**
   * Get subscription by ID
   */
  getSubscription(subscriptionId: string): Promise<Subscription | null>;

  /**
   * Get customer's active subscription
   */
  getCustomerSubscription(customerId: string): Promise<Subscription | null>;

  /**
   * Cancel subscription
   */
  cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd?: boolean
  ): Promise<Subscription>;

  /**
   * Resume subscription
   */
  resumeSubscription(subscriptionId: string): Promise<Subscription>;

  /**
   * Record usage for metered billing
   */
  recordUsage(record: UsageRecord): Promise<void>;

  /**
   * Get usage summary for customer
   */
  getUsageSummary(customerId: string): Promise<UsageSummary | null>;

  /**
   * List customer's invoices
   */
  listInvoices(customerId: string, limit?: number): Promise<Invoice[]>;

  /**
   * Get customer's payment methods
   */
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): WebhookEvent;

  /**
   * Handle webhook event
   */
  handleWebhookEvent(event: WebhookEvent): Promise<void>;
}
