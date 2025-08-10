import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  account,
  aiPreference,
  chatbotInteraction,
  stripeSubscription,
  usageMetric,
} from ".";

export const user = pgTable("user", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  emailAddress: varchar("email_address", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  imageUrl: text("image_url"),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  role: text("role", { enum: ["user", "admin", "moderator"] }).default("user"),
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(user, ({ one, many }) => ({
  stripeSubscription: one(stripeSubscription, {
    fields: [user.stripeSubscriptionId],
    references: [stripeSubscription.id],
  }),
  accounts: many(account),
  chatbotInteractions: many(chatbotInteraction),
  aiPreferences: one(aiPreference, {
    fields: [user.id],
    references: [aiPreference.userId],
  }),
  usageMetrics: many(usageMetric),
}));
