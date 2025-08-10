-- Setup Row Level Security (RLS) policies for Supabase integration
-- This should be run in your Supabase SQL editor or via migrations

-- Enable RLS on all tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "thread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_preference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_email_summary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chatbot_interaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_metric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stripe_subscription" ENABLE ROW LEVEL SECURITY;

-- User table policies
CREATE POLICY "Users can view their own profile" ON "user"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON "user"
  FOR UPDATE USING (auth.uid() = id);

-- Account table policies
CREATE POLICY "Users can view their own accounts" ON "account"
  FOR ALL USING (auth.uid() = user_id);

-- Email table policies
CREATE POLICY "Users can view their own emails" ON "email"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "thread" t
      JOIN "account" a ON a.id = t.account_id 
      WHERE t.id = "email".thread_id 
      AND a.user_id = auth.uid()
    )
  );

-- Thread table policies
CREATE POLICY "Users can view their own threads" ON "thread"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "account" a 
      WHERE a.id = "thread".account_id 
      AND a.user_id = auth.uid()
    )
  );

-- Email address policies
CREATE POLICY "Users can view their own email addresses" ON "email_address"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "account" a 
      WHERE a.id = "email_address".account_id 
      AND a.user_id = auth.uid()
    )
  );

-- Email attachment policies
CREATE POLICY "Users can view their own email attachments" ON "email_attachment"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "email" e
      JOIN "thread" t ON t.id = e.thread_id
      JOIN "account" a ON a.id = t.account_id
      WHERE e.id = "email_attachment".email_id 
      AND a.user_id = auth.uid()
    )
  );

-- Email recipient policies
CREATE POLICY "Users can view their own email recipients" ON "email_recipient"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "email" e
      JOIN "thread" t ON t.id = e.thread_id
      JOIN "account" a ON a.id = t.account_id
      WHERE e.id = "email_recipient".email_id 
      AND a.user_id = auth.uid()
    )
  );

-- Email folder policies
CREATE POLICY "Users can view their own email folders" ON "email_folder"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "account" a 
      WHERE a.id = "email_folder".account_id 
      AND a.user_id = auth.uid()
    )
  );

-- AI preference policies
CREATE POLICY "Users can view their own AI preferences" ON "ai_preference"
  FOR ALL USING (auth.uid() = user_id);

-- AI email summary policies
CREATE POLICY "Users can view their own AI email summaries" ON "ai_email_summary"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "email" e
      JOIN "thread" t ON t.id = e.thread_id
      JOIN "account" a ON a.id = t.account_id
      WHERE e.id = "ai_email_summary".email_id 
      AND a.user_id = auth.uid()
    )
  );

-- Chatbot interaction policies
CREATE POLICY "Users can view their own chatbot interactions" ON "chatbot_interaction"
  FOR ALL USING (auth.uid() = user_id);

-- Usage metric policies
CREATE POLICY "Users can view their own usage metrics" ON "usage_metric"
  FOR SELECT USING (auth.uid() = user_id);

-- Stripe subscription policies
CREATE POLICY "Users can view their own subscriptions" ON "stripe_subscription"
  FOR SELECT USING (auth.uid() = user_id);

-- Enable real-time for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE "email";
ALTER PUBLICATION supabase_realtime ADD TABLE "thread";
ALTER PUBLICATION supabase_realtime ADD TABLE "chatbot_interaction";
ALTER PUBLICATION supabase_realtime ADD TABLE "ai_email_summary";
