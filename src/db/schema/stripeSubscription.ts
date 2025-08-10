import {
  pgTable,
  text,
  varchar,
  json,
  timestamp,
  boolean,
  primaryKey,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from ".";

export const stripeSubscription = pgTable("stripe_subscription", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").unique().notNull(), // Stripe subscription ID
  productId: text("product_id"), // Stripe product ID
  priceId: text("price_id"), // Stripe price ID
  customerId: text("customer_id"), // Stripe customer ID
  status: text("status").notNull(), // active, inactive, canceled, past_due
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  amount: numeric("amount"), // Price amount
  currency: text("currency").default("usd"),
  interval: text("interval"), // month, year
  intervalCount: text("interval_count").default("1"),
  metadata: json("metadata").default("{}"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stripeSubscriptionRelations = relations(
  stripeSubscription,
  ({ one }) => ({
    user: one(user, {
      fields: [stripeSubscription.userId],
      references: [user.id],
    }),
  })
);
