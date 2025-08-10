-- Database Indexes for MailPilot AI
-- These indexes optimize query performance for common operations
-- Note:  removed for initial setup - add it back for production updates

-- User Table Indexes
CREATE INDEX IF NOT EXISTS idx_user_email_address ON "user"(email_address);
CREATE INDEX IF NOT EXISTS idx_user_stripe_subscription_id ON "user"(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_is_active ON "user"(is_active);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(created_at DESC);

-- Account Table Indexes
CREATE INDEX  IF NOT EXISTS idx_account_user_id ON account(user_id);
CREATE INDEX  IF NOT EXISTS idx_account_email_address ON account(email_address);
CREATE INDEX  IF NOT EXISTS idx_account_provider ON account(provider);
CREATE INDEX  IF NOT EXISTS idx_account_is_active ON account(is_active);
CREATE INDEX  IF NOT EXISTS idx_account_sync_status ON account(sync_status);
CREATE INDEX  IF NOT EXISTS idx_account_last_sync_at ON account(last_sync_at DESC);

-- Thread Table Indexes
CREATE INDEX  IF NOT EXISTS idx_thread_account_id ON thread(account_id);
CREATE INDEX  IF NOT EXISTS idx_thread_last_message_date ON thread(last_message_date DESC);
CREATE INDEX  IF NOT EXISTS idx_thread_inbox_status ON thread(inbox_status);
CREATE INDEX  IF NOT EXISTS idx_thread_is_starred ON thread(is_starred);
CREATE INDEX  IF NOT EXISTS idx_thread_is_archived ON thread(is_archived);
CREATE INDEX  IF NOT EXISTS idx_thread_is_deleted ON thread(is_deleted);
CREATE INDEX  IF NOT EXISTS idx_thread_done ON thread(done);
CREATE INDEX  IF NOT EXISTS idx_thread_account_inbox ON thread(account_id, inbox_status);

-- Email Table Indexes
CREATE INDEX  IF NOT EXISTS idx_email_thread_id ON email(thread_id);
CREATE INDEX  IF NOT EXISTS idx_email_from_id ON email(from_id);
CREATE INDEX  IF NOT EXISTS idx_email_sent_at ON email(sent_at DESC);
CREATE INDEX  IF NOT EXISTS idx_email_received_at ON email(received_at DESC);
CREATE INDEX  IF NOT EXISTS idx_email_internet_message_id ON email(internet_message_id);
CREATE INDEX  IF NOT EXISTS idx_email_is_read ON email(is_read);
CREATE INDEX  IF NOT EXISTS idx_email_is_starred ON email(is_starred);
CREATE INDEX  IF NOT EXISTS idx_email_is_important ON email(is_important);
CREATE INDEX  IF NOT EXISTS idx_email_is_draft ON email(is_draft);
CREATE INDEX  IF NOT EXISTS idx_email_email_label ON email(email_label);
CREATE INDEX  IF NOT EXISTS idx_email_has_attachments ON email(has_attachments);

-- Composite indexes for common queries
CREATE INDEX  IF NOT EXISTS idx_email_thread_sent_at ON email(thread_id, sent_at DESC);
CREATE INDEX  IF NOT EXISTS idx_email_read_starred ON email(is_read, is_starred);

-- Email Address Table Indexes
CREATE INDEX  IF NOT EXISTS idx_email_address_account_id ON email_address(account_id);
CREATE INDEX  IF NOT EXISTS idx_email_address_address ON email_address(address);
CREATE INDEX  IF NOT EXISTS idx_email_address_is_verified ON email_address(is_verified);

-- Email Recipient Table Indexes
CREATE INDEX  IF NOT EXISTS idx_email_recipient_email_id ON email_recipient(email_id);
CREATE INDEX  IF NOT EXISTS idx_email_recipient_email_address_id ON email_recipient(email_address_id);
CREATE INDEX  IF NOT EXISTS idx_email_recipient_type ON email_recipient(recipient_type);
CREATE INDEX  IF NOT EXISTS idx_email_recipient_email_type ON email_recipient(email_id, recipient_type);

-- Email Attachment Table Indexes
CREATE INDEX  IF NOT EXISTS idx_email_attachment_email_id ON email_attachment(email_id);
CREATE INDEX  IF NOT EXISTS idx_email_attachment_mime_type ON email_attachment(mime_type);
CREATE INDEX  IF NOT EXISTS idx_email_attachment_size ON email_attachment(size);
CREATE INDEX  IF NOT EXISTS idx_email_attachment_is_scanned ON email_attachment(is_scanned);

-- Email Folder Table Indexes
CREATE INDEX  IF NOT EXISTS idx_email_folder_account_id ON email_folder(account_id);
CREATE INDEX  IF NOT EXISTS idx_email_folder_parent_folder_id ON email_folder(parent_folder_id);
CREATE INDEX  IF NOT EXISTS idx_email_folder_type ON email_folder(type);
CREATE INDEX  IF NOT EXISTS idx_email_folder_system_type ON email_folder(system_type);
CREATE INDEX  IF NOT EXISTS idx_email_folder_is_hidden ON email_folder(is_hidden);
CREATE INDEX  IF NOT EXISTS idx_email_folder_sort_order ON email_folder(sort_order);

-- AI Preference Table Indexes
CREATE INDEX  IF NOT EXISTS idx_ai_preference_user_id ON ai_preference(user_id);
CREATE INDEX  IF NOT EXISTS idx_ai_preference_auto_reply ON ai_preference(auto_reply);
CREATE INDEX  IF NOT EXISTS idx_ai_preference_auto_sort ON ai_preference(auto_sort);

-- AI Email Summary Table Indexes
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_email_id ON ai_email_summary(email_id);
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_user_id ON ai_email_summary(user_id);
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_sentiment ON ai_email_summary(sentiment);
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_priority ON ai_email_summary(priority);
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_category ON ai_email_summary(category);
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_confidence_score ON ai_email_summary(confidence_score DESC);
CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_created_at ON ai_email_summary(created_at DESC);

-- Chatbot Interaction Table Indexes
CREATE INDEX  IF NOT EXISTS idx_chatbot_interaction_user_id ON chatbot_interaction(user_id);
CREATE INDEX  IF NOT EXISTS idx_chatbot_interaction_type ON chatbot_interaction(interaction_type);
CREATE INDEX  IF NOT EXISTS idx_chatbot_interaction_day ON chatbot_interaction(day);
CREATE INDEX  IF NOT EXISTS idx_chatbot_interaction_created_at ON chatbot_interaction(created_at DESC);
CREATE INDEX  IF NOT EXISTS idx_chatbot_interaction_rating ON chatbot_interaction(satisfaction_rating);

-- Stripe Subscription Table Indexes
CREATE INDEX  IF NOT EXISTS idx_stripe_subscription_user_id ON stripe_subscription(user_id);
CREATE INDEX  IF NOT EXISTS idx_stripe_subscription_subscription_id ON stripe_subscription(subscription_id);
CREATE INDEX  IF NOT EXISTS idx_stripe_subscription_customer_id ON stripe_subscription(customer_id);
CREATE INDEX  IF NOT EXISTS idx_stripe_subscription_status ON stripe_subscription(status);
CREATE INDEX  IF NOT EXISTS idx_stripe_subscription_current_period_end ON stripe_subscription(current_period_end);
CREATE INDEX  IF NOT EXISTS idx_stripe_subscription_trial_end ON stripe_subscription(trial_end);

-- Usage Metric Table Indexes
CREATE INDEX  IF NOT EXISTS idx_usage_metric_user_id ON usage_metric(user_id);
CREATE INDEX  IF NOT EXISTS idx_usage_metric_type ON usage_metric(metric_type);
CREATE INDEX  IF NOT EXISTS idx_usage_metric_period_start ON usage_metric(period_start DESC);
CREATE INDEX  IF NOT EXISTS idx_usage_metric_period_end ON usage_metric(period_end DESC);
CREATE INDEX  IF NOT EXISTS idx_usage_metric_user_type_period ON usage_metric(user_id, metric_type, period_start DESC);

-- Full-text search indexes for email content
CREATE INDEX  IF NOT EXISTS idx_email_subject_search ON email USING gin(to_tsvector('english', subject));
CREATE INDEX  IF NOT EXISTS idx_email_body_search ON email USING gin(to_tsvector('english', body));
CREATE INDEX  IF NOT EXISTS idx_email_body_snippet_search ON email USING gin(to_tsvector('english', body_snippet));

-- Note: JSON field indexes commented out due to json vs jsonb compatibility
-- Uncomment and modify these if you change schema to use jsonb instead of json
-- CREATE INDEX  IF NOT EXISTS idx_email_sys_labels ON email USING gin(sys_labels jsonb_path_ops);
-- CREATE INDEX  IF NOT EXISTS idx_email_keywords ON email USING gin(keywords jsonb_path_ops);
-- CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_key_points ON ai_email_summary USING gin(key_points jsonb_path_ops);
-- CREATE INDEX  IF NOT EXISTS idx_ai_email_summary_action_items ON ai_email_summary USING gin(action_items jsonb_path_ops);
