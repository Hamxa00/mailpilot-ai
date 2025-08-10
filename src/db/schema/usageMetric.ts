import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from ".";

export const usageMetric = pgTable("usage_metric", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(), // api_calls, emails_processed, ai_summaries_generated
  value: integer("value").notNull(),
  metadata: json("metadata").default("{}"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usageMetricRelations = relations(usageMetric, ({ one }) => ({
  user: one(user, {
    fields: [usageMetric.userId],
    references: [user.id],
  }),
}));
