import {
  pgTable,
  text,
  varchar,
  json,
  timestamp,
  boolean,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { emailAddress, thread, user } from ".";

export const account = pgTable("account", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  binaryIndex: json("binary_index"),
  token: varchar("token", { length: 255 }).unique(),
  refreshToken: text("refresh_token"), // Add refresh token for OAuth
  tokenExpiresAt: timestamp("token_expires_at"), // Token expiration
  provider: varchar("provider", { length: 255 }).notNull(), // Make required
  providerAccountId: text("provider_account_id"), // Provider's account ID
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  nextDeltaToken: text("next_delta_token"),
  syncStatus: text("sync_status").default("active"), // active, paused, error
  lastSyncAt: timestamp("last_sync_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountRelations = relations(account, ({ one, many }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
  threads: many(thread),
  emailAddresses: many(emailAddress),
}));
