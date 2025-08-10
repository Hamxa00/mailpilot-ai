import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { account } from ".";

export const emailFolder = pgTable("email_folder", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid("account_id")
    .notNull()
    .references(() => account.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  type: text("type").notNull(), // system, custom, smart
  systemType: text("system_type"), // inbox, sent, drafts, trash, spam, archive
  color: varchar("color", { length: 7 }), // hex color code
  icon: varchar("icon", { length: 50 }),
  parentFolderId: uuid("parent_folder_id"),
  isHidden: boolean("is_hidden").default(false),
  sortOrder: integer("sort_order").default(0),
  unreadCount: integer("unread_count").default(0),
  totalCount: integer("total_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailFolderRelations = relations(emailFolder, ({ one, many }) => ({
  account: one(account, {
    fields: [emailFolder.accountId],
    references: [account.id],
  }),
  parentFolder: one(emailFolder, {
    fields: [emailFolder.parentFolderId],
    references: [emailFolder.id],
  }),
  childFolders: many(emailFolder),
}));
