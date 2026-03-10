-- =============================================
-- 010: LINE Integration
-- =============================================

-- Add LINE fields to alumni_trainers
ALTER TABLE alumni_trainers
  ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ;

-- Create index for LINE user lookup
CREATE INDEX IF NOT EXISTS idx_alumni_trainers_line_user_id
  ON alumni_trainers(line_user_id) WHERE line_user_id IS NOT NULL;

-- =============================================
-- LINE Link Tokens (one-time tokens for account linking)
-- =============================================

CREATE TABLE IF NOT EXISTS line_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_line_link_tokens_token
  ON line_link_tokens(token) WHERE used = FALSE;

-- RLS
ALTER TABLE line_link_tokens ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own tokens
CREATE POLICY "trainers_read_own_link_tokens" ON line_link_tokens
  FOR SELECT USING (
    trainer_id IN (
      SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================
-- LINE Notifications (tracker for sent LINE messages)
-- =============================================

CREATE TABLE IF NOT EXISTS line_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for trainer notification history
CREATE INDEX IF NOT EXISTS idx_line_notifications_trainer_id
  ON line_notifications(trainer_id);

-- RLS
ALTER TABLE line_notifications ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own notifications
CREATE POLICY "trainers_read_own_line_notifications" ON line_notifications
  FOR SELECT USING (
    trainer_id IN (
      SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
    )
  );
