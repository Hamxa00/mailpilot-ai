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
import { emailAddress, emailAttachment, emailRecipient, thread } from ".";

export const email = pgTable("email", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  createdTime: timestamp("created_time").notNull(),
  lastModifiedTime: timestamp("last_modified_time").notNull(),
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  internetMessageId: text("internet_message_id").notNull().unique(), // Should be unique
  subject: text("subject"),
  sysLabels: json("sys_labels").notNull().default("[]"),
  keywords: json("keywords").notNull().default("[]"),
  sysClassifications: json("sys_classifications").notNull().default("[]"),
  sensitivity: text("sensitivity").default("normal"),
  meetingMessageMethod: text("meeting_message_method"),
  fromId: uuid("from_id")
    .notNull()
    .references(() => emailAddress.id),
  hasAttachments: boolean("has_attachments").default(false),
  body: text("body"),
  bodySnippet: text("body_snippet"),
  inReplyTo: text("in_reply_to"),
  references: text("references"),
  threadIndex: text("thread_index"),
  internetHeaders: json("internet_headers").notNull().default("{}"),
  nativeProperties: json("native_properties"),
  folderId: text("folder_id"),
  omitted: json("omitted").notNull().default("{}"),
  emailLabel: text("email_label").default("inbox"),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  isImportant: boolean("is_important").default(false),
  isDraft: boolean("is_draft").default(false),
  size: integer("size"), // Email size in bytes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailRelations = relations(email, ({ one, many }) => ({
  thread: one(thread, {
    fields: [email.threadId],
    references: [thread.id],
  }),
  from: one(emailAddress, {
    fields: [email.fromId],
    references: [emailAddress.id],
  }),
  attachments: many(emailAttachment),
  recipients: many(emailRecipient),
}));
