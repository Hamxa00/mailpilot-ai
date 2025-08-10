import {
  pgTable,
  text,
  varchar,
  uuid,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { email, emailAddress } from ".";

export const emailRecipient = pgTable("email_recipient", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: uuid("email_id")
    .notNull()
    .references(() => email.id, { onDelete: "cascade" }),
  emailAddressId: uuid("email_address_id")
    .notNull()
    .references(() => emailAddress.id),
  recipientType: text("recipient_type").notNull(), // 'to', 'cc', 'bcc'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailRecipientRelations = relations(emailRecipient, ({ one }) => ({
  email: one(email, {
    fields: [emailRecipient.emailId],
    references: [email.id],
  }),
  emailAddress: one(emailAddress, {
    fields: [emailRecipient.emailAddressId],
    references: [emailAddress.id],
  }),
}));
