CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" uuid NOT NULL,
	"binary_index" json,
	"token" varchar(255),
	"refresh_token" text,
	"token_expires_at" timestamp,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" text,
	"email_address" varchar(255) NOT NULL,
	"name" varchar(255),
	"next_delta_token" text,
	"sync_status" text DEFAULT 'active',
	"last_sync_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ai_email_summary" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"email_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"key_points" json DEFAULT '[]',
	"sentiment" text,
	"priority" text DEFAULT 'medium',
	"category" text,
	"action_items" json DEFAULT '[]',
	"suggested_reply" text,
	"confidence_score" integer,
	"ai_model" text,
	"processing_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_preference" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" uuid NOT NULL,
	"auto_reply" boolean DEFAULT false,
	"auto_sort" boolean DEFAULT true,
	"smart_notifications" boolean DEFAULT true,
	"priority_detection" boolean DEFAULT true,
	"email_summary" boolean DEFAULT false,
	"reply_tone" text DEFAULT 'professional',
	"auto_reply_rules" json DEFAULT '[]',
	"custom_prompts" json DEFAULT '{}',
	"language_preference" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_interaction" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" uuid NOT NULL,
	"interaction_type" text NOT NULL,
	"query" text NOT NULL,
	"response" text NOT NULL,
	"metadata" json DEFAULT '{}',
	"response_time" integer,
	"satisfaction_rating" integer,
	"day" varchar(50) NOT NULL,
	"count" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"thread_id" uuid NOT NULL,
	"created_time" timestamp NOT NULL,
	"last_modified_time" timestamp NOT NULL,
	"sent_at" timestamp,
	"received_at" timestamp,
	"internet_message_id" text NOT NULL,
	"subject" text,
	"sys_labels" json DEFAULT '[]' NOT NULL,
	"keywords" json DEFAULT '[]' NOT NULL,
	"sys_classifications" json DEFAULT '[]' NOT NULL,
	"sensitivity" text DEFAULT 'normal',
	"meeting_message_method" text,
	"from_id" uuid NOT NULL,
	"has_attachments" boolean DEFAULT false,
	"body" text,
	"body_snippet" text,
	"in_reply_to" text,
	"references" text,
	"thread_index" text,
	"internet_headers" json DEFAULT '{}' NOT NULL,
	"native_properties" json,
	"folder_id" text,
	"omitted" json DEFAULT '{}' NOT NULL,
	"email_label" text DEFAULT 'inbox',
	"is_read" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"is_important" boolean DEFAULT false,
	"is_draft" boolean DEFAULT false,
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_internet_message_id_unique" UNIQUE("internet_message_id")
);
--> statement-breakpoint
CREATE TABLE "email_address" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"name" text,
	"address" varchar(255) NOT NULL,
	"raw" text,
	"account_id" uuid NOT NULL,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_attachment" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"inline" boolean NOT NULL,
	"content_id" text,
	"content" text,
	"content_location" text,
	"email_id" uuid NOT NULL,
	"is_scanned" boolean DEFAULT false,
	"scan_result" text,
	"download_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_folder" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"type" text NOT NULL,
	"system_type" text,
	"color" varchar(7),
	"icon" varchar(50),
	"parent_folder_id" uuid,
	"is_hidden" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"unread_count" integer DEFAULT 0,
	"total_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_recipient" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"email_id" uuid NOT NULL,
	"email_address_id" uuid NOT NULL,
	"recipient_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"image_url" text,
	"stripe_subscription_id" text,
	"role" text DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_address_unique" UNIQUE("email_address"),
	CONSTRAINT "user_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_subscription" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" text NOT NULL,
	"product_id" text,
	"price_id" text,
	"customer_id" text,
	"status" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"amount" numeric,
	"currency" text DEFAULT 'usd',
	"interval" text,
	"interval_count" text DEFAULT '1',
	"metadata" json DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_subscription_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "stripe_subscription_subscription_id_unique" UNIQUE("subscription_id")
);
--> statement-breakpoint
CREATE TABLE "thread" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"subject" text NOT NULL,
	"last_message_date" timestamp NOT NULL,
	"participant_ids" json DEFAULT '[]' NOT NULL,
	"account_id" uuid NOT NULL,
	"message_count" integer DEFAULT 0,
	"done" boolean DEFAULT false,
	"inbox_status" boolean DEFAULT true,
	"draft_status" boolean DEFAULT false,
	"sent_status" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"is_important" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"is_spam" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_metric" (
	"id" uuid PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"value" integer NOT NULL,
	"metadata" json DEFAULT '{}',
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_email_summary" ADD CONSTRAINT "ai_email_summary_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_email_summary" ADD CONSTRAINT "ai_email_summary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_preference" ADD CONSTRAINT "ai_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_interaction" ADD CONSTRAINT "chatbot_interaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_from_id_email_address_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."email_address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_address" ADD CONSTRAINT "email_address_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folder" ADD CONSTRAINT "email_folder_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipient" ADD CONSTRAINT "email_recipient_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipient" ADD CONSTRAINT "email_recipient_email_address_id_email_address_id_fk" FOREIGN KEY ("email_address_id") REFERENCES "public"."email_address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_subscription" ADD CONSTRAINT "stripe_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_metric" ADD CONSTRAINT "usage_metric_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;