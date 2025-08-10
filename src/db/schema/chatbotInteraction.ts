import {
  pgTable,
  text,
  varchar,
  json,
  timestamp,
  boolean,
  primaryKey,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from ".";

export const chatbotInteraction = pgTable("chatbot_interaction", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  interactionType: text("interaction_type").notNull(), // query, command, feedback
  query: text("query").notNull(),
  response: text("response").notNull(),
  metadata: json("metadata").default("{}"),
  responseTime: integer("response_time"), // milliseconds
  satisfactionRating: integer("satisfaction_rating"), // 1-5 stars
  day: varchar("day", { length: 50 }).notNull(),
  count: integer("count").default(1), // Changed from text to integer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatbotInteractionRelations = relations(
  chatbotInteraction,
  ({ one }) => ({
    user: one(user, {
      fields: [chatbotInteraction.userId],
      references: [user.id],
    }),
  })
);
