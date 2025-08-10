import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from ".";

export const aiPreference = pgTable("ai_preference", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  autoReply: boolean("auto_reply").default(false),
  autoSort: boolean("auto_sort").default(true),
  smartNotifications: boolean("smart_notifications").default(true),
  priorityDetection: boolean("priority_detection").default(true),
  emailSummary: boolean("email_summary").default(false),
  replyTone: text("reply_tone").default("professional"), // professional, casual, friendly
  autoReplyRules: json("auto_reply_rules").default("[]"),
  customPrompts: json("custom_prompts").default("{}"),
  languagePreference: text("language_preference").default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiPreferenceRelations = relations(aiPreference, ({ one }) => ({
  user: one(user, {
    fields: [aiPreference.userId],
    references: [user.id],
  }),
}));
