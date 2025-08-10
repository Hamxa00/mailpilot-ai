import { InferSelectModel } from "drizzle-orm";
import * as schema from "./schema";

export type User = InferSelectModel<typeof schema.user>;
export type Account = InferSelectModel<typeof schema.account>;
export type StripeSubscription = InferSelectModel<
  typeof schema.stripeSubscription
>;
export type ChatbotInteraction = InferSelectModel<
  typeof schema.chatbotInteraction
>;
export type Thread = InferSelectModel<typeof schema.thread>;
export type Email = InferSelectModel<typeof schema.email>;
export type EmailAddress = InferSelectModel<typeof schema.emailAddress>;
export type EmailAttachment = InferSelectModel<typeof schema.emailAttachment>;
export type EmailRecipient = InferSelectModel<typeof schema.emailRecipient>;
export type EmailFolder = InferSelectModel<typeof schema.emailFolder>;
export type AiPreference = InferSelectModel<typeof schema.aiPreference>;
export type AiEmailSummary = InferSelectModel<typeof schema.aiEmailSummary>;
export type UsageMetric = InferSelectModel<typeof schema.usageMetric>;
