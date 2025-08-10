import {
  pgTable,
  text,
  uuid,
  timestamp,
  json,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user, email } from ".";

export const aiEmailSummary = pgTable("ai_email_summary", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  emailId: uuid("email_id")
    .notNull()
    .references(() => email.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  keyPoints: json("key_points").default("[]"),
  sentiment: text("sentiment"), // positive, negative, neutral
  priority: text("priority").default("medium"), // high, medium, low
  category: text("category"), // work, personal, newsletter, etc.
  actionItems: json("action_items").default("[]"),
  suggestedReply: text("suggested_reply"),
  confidenceScore: integer("confidence_score"), // 0-100
  aiModel: text("ai_model"), // Track which AI model was used
  processingTime: integer("processing_time"), // milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiEmailSummaryRelations = relations(aiEmailSummary, ({ one }) => ({
  email: one(email, {
    fields: [aiEmailSummary.emailId],
    references: [email.id],
  }),
  user: one(user, {
    fields: [aiEmailSummary.userId],
    references: [user.id],
  }),
}));
