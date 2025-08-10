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
import { account, email } from ".";

export const thread = pgTable("thread", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  lastMessageDate: timestamp("last_message_date").notNull(),
  participantIds: json("participant_ids").notNull().default("[]"),
  accountId: uuid("account_id")
    .notNull()
    .references(() => account.id, { onDelete: "cascade" }),
  messageCount: integer("message_count").default(0),
  done: boolean("done").default(false),
  inboxStatus: boolean("inbox_status").default(true),
  draftStatus: boolean("draft_status").default(false),
  sentStatus: boolean("sent_status").default(false),
  isStarred: boolean("is_starred").default(false),
  isImportant: boolean("is_important").default(false),
  isArchived: boolean("is_archived").default(false),
  isSpam: boolean("is_spam").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const threadRelations = relations(thread, ({ one, many }) => ({
  account: one(account, {
    fields: [thread.accountId],
    references: [account.id],
  }),
  emails: many(email),
}));
