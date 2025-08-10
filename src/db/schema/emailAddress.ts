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
import { account } from ".";

export const emailAddress = pgTable("email_address", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  address: varchar("address", { length: 255 }).notNull(),
  raw: text("raw"),
  accountId: uuid("account_id")
    .notNull()
    .references(() => account.id, { onDelete: "cascade" }),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailAddressRelations = relations(
  emailAddress,
  ({ one, many }) => ({
    account: one(account, {
      fields: [emailAddress.accountId],
      references: [account.id],
    }),
  })
);
