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
import { email } from ".";

export const emailAttachment = pgTable("email_attachment", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // Changed from text to integer
  inline: boolean("inline").notNull(),
  contentId: text("content_id"),
  content: text("content"), // Consider storing in blob storage for large files
  contentLocation: text("content_location"),
  emailId: uuid("email_id")
    .notNull()
    .references(() => email.id, { onDelete: "cascade" }),
  isScanned: boolean("is_scanned").default(false), // For virus/malware scanning
  scanResult: text("scan_result"), // clean, infected, suspicious
  downloadUrl: text("download_url"), // For external storage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailAttachmentRelations = relations(
  emailAttachment,
  ({ one }) => ({
    email: one(email, {
      fields: [emailAttachment.emailId],
      references: [email.id],
    }),
  })
);
