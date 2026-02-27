-- =============================================
-- Dr.stretch SPOT - Phase 2 Schema Migration
-- New tables + Column additions + pg_cron jobs
-- =============================================

-- =============================================
-- 1. New Tables
-- =============================================

-- config_snapshots - Configuration rollback snapshots (H-6)
CREATE TABLE IF NOT EXISTS config_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('rate_config', 'blank_rule_config', 'cost_ceiling')),
  snapshot_data JSONB NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- cost_ceiling_config - Cost ceiling management (H-4)
CREATE TABLE IF NOT EXISTS cost_ceiling_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  max_hourly_rate INTEGER NOT NULL DEFAULT 3000,
  active_employee_ratio_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
  per_store_emergency_budget_default INTEGER NOT NULL DEFAULT 50000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. Column Additions to Existing Tables
-- =============================================

-- alumni_trainers: rank and badges for T-12
ALTER TABLE alumni_trainers
  ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'bronze'
    CHECK (rank IN ('bronze', 'silver', 'gold', 'platinum')),
  ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- alumni_trainers: spot_status column (may already exist from 006)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alumni_trainers' AND column_name = 'spot_status'
  ) THEN
    ALTER TABLE alumni_trainers
      ADD COLUMN spot_status TEXT DEFAULT 'registered'
        CHECK (spot_status IN ('registered', 'active', 'inactive', 'paused'));
  END IF;
END $$;

-- shift_templates: recurring settings for S-7
ALTER TABLE shift_templates
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_days INTEGER[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- notification_logs: read tracking + title for T-14/S-9
ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS title TEXT;

-- stores: per-store cost ceiling override for A-4
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS cost_ceiling_override INTEGER;

-- =============================================
-- 3. Update notification_logs category constraint
-- =============================================
-- Drop and recreate the constraint to include new categories
DO $$
BEGIN
  -- Check if the constraint exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'notification_logs_category_check'
  ) THEN
    ALTER TABLE notification_logs DROP CONSTRAINT notification_logs_category_check;
  END IF;
END $$;

ALTER TABLE notification_logs
  ADD CONSTRAINT notification_logs_category_check
  CHECK (category IN (
    'shift_published',
    'application_received',
    'application_confirmed',
    'application_rejected',
    'application_cancelled',
    'pre_day_reminder',
    'day_reminder',
    'clock_in',
    'clock_out',
    'shift_approval_request',
    'shift_approved',
    'blank_alert',
    'cost_alert',
    'rank_update',
    'skill_check_scheduled',
    'emergency_auto_trigger'
  ));

-- =============================================
-- 4. Update change_type constraint for rate_change_logs
-- =============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'rate_change_logs_change_type_check'
  ) THEN
    ALTER TABLE rate_change_logs DROP CONSTRAINT rate_change_logs_change_type_check;
  END IF;
END $$;

ALTER TABLE rate_change_logs
  ADD CONSTRAINT rate_change_logs_change_type_check
  CHECK (change_type IN (
    'rate_update', 'rate_create', 'rate_delete',
    'blank_rule_update', 'simulation',
    'cost_ceiling_update', 'config_rollback',
    'store_budget_update'
  ));

-- =============================================
-- 5. RLS Policies for New Tables
-- =============================================

ALTER TABLE config_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_ceiling_config ENABLE ROW LEVEL SECURITY;

-- config_snapshots: HR/Admin can read and create
CREATE POLICY "HR and Admin can view config snapshots"
  ON config_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin', 'area_manager')
    )
  );

CREATE POLICY "HR and Admin can create config snapshots"
  ON config_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- cost_ceiling_config: HR/Admin can read and update
CREATE POLICY "HR and Admin can view cost ceiling"
  ON cost_ceiling_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin', 'area_manager')
    )
  );

CREATE POLICY "HR and Admin can manage cost ceiling"
  ON cost_ceiling_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- =============================================
-- 6. Indexes for Performance
-- =============================================

-- notification_logs: user_id + read_at for unread count queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread
  ON notification_logs (user_id, read_at)
  WHERE read_at IS NULL;

-- notification_logs: user_id + created_at for timeline queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_timeline
  ON notification_logs (user_id, created_at DESC);

-- config_snapshots: snapshot_type + created_at for listing
CREATE INDEX IF NOT EXISTS idx_config_snapshots_type_date
  ON config_snapshots (snapshot_type, created_at DESC);

-- alumni_trainers: rank for filtering
CREATE INDEX IF NOT EXISTS idx_alumni_trainers_rank
  ON alumni_trainers (rank);

-- alumni_trainers: blank_status for batch queries
CREATE INDEX IF NOT EXISTS idx_alumni_trainers_blank_status
  ON alumni_trainers (blank_status)
  WHERE status = 'active';

-- skill_checks: trainer_id + check_date for history
CREATE INDEX IF NOT EXISTS idx_skill_checks_trainer_date
  ON skill_checks (trainer_id, check_date DESC);

-- =============================================
-- 7. Seed Data for cost_ceiling_config
-- =============================================

INSERT INTO cost_ceiling_config (max_hourly_rate, active_employee_ratio_threshold, per_store_emergency_budget_default, is_active)
VALUES (3000, 0.85, 50000, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- 8. pg_cron Jobs (Batch Processing)
-- =============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Daily blank status update (JST 02:00 = UTC 17:00)
SELECT cron.schedule(
  'update-blank-status-daily',
  '0 17 * * *',
  $$
  UPDATE alumni_trainers SET
    blank_status = CASE
      WHEN COALESCE(CURRENT_DATE - last_shift_date, 9999) >= (
        SELECT threshold_days FROM blank_rule_config
        WHERE rule_type = 'training_required' AND is_active = true
        LIMIT 1
      ) THEN 'training_required'
      WHEN COALESCE(CURRENT_DATE - last_shift_date, 9999) >= (
        SELECT threshold_days FROM blank_rule_config
        WHERE rule_type = 'skill_check_required' AND is_active = true
        LIMIT 1
      ) THEN 'skill_check_required'
      WHEN COALESCE(CURRENT_DATE - last_shift_date, 9999) >= (
        SELECT threshold_days FROM blank_rule_config
        WHERE rule_type = 'alert_60' AND is_active = true
        LIMIT 1
      ) THEN 'alert_60'
      ELSE 'ok'
    END,
    updated_at = NOW()
  WHERE status = 'active'
    AND (spot_status = 'active' OR spot_status IS NULL);
  $$
);

-- Job 2: Daily rank update (JST 03:00 = UTC 18:00)
SELECT cron.schedule(
  'update-trainer-ranks-daily',
  '0 18 * * *',
  $$
  WITH trainer_stats AS (
    SELECT
      t.id,
      COALESCE((
        SELECT COUNT(*)
        FROM attendance_records ar
        WHERE ar.trainer_id = t.id
        AND ar.status IN ('clocked_out', 'verified')
      ), 0) as completed_shifts,
      COALESCE((
        SELECT AVG(e.rating)
        FROM evaluations e
        WHERE e.trainer_id = t.id
      ), 0) as avg_rating
    FROM alumni_trainers t
    WHERE t.status = 'active'
  )
  UPDATE alumni_trainers SET
    rank = CASE
      WHEN ts.completed_shifts >= 50 AND ts.avg_rating >= 4.5 THEN 'platinum'
      WHEN ts.completed_shifts >= 30 AND ts.avg_rating >= 4.0 THEN 'gold'
      WHEN ts.completed_shifts >= 10 AND ts.avg_rating >= 3.5 THEN 'silver'
      ELSE 'bronze'
    END,
    updated_at = NOW()
  FROM trainer_stats ts
  WHERE alumni_trainers.id = ts.id
    AND alumni_trainers.rank IS DISTINCT FROM (
      CASE
        WHEN ts.completed_shifts >= 50 AND ts.avg_rating >= 4.5 THEN 'platinum'
        WHEN ts.completed_shifts >= 30 AND ts.avg_rating >= 4.0 THEN 'gold'
        WHEN ts.completed_shifts >= 10 AND ts.avg_rating >= 3.5 THEN 'silver'
        ELSE 'bronze'
      END
    );
  $$
);

-- Job 3: Monthly emergency budget reset (1st day JST 00:00 = UTC 15:00 previous day)
SELECT cron.schedule(
  'reset-emergency-budgets-monthly',
  '0 15 1 * *',
  $$
  UPDATE stores SET
    emergency_budget_used = 0,
    emergency_budget_reset_at = CURRENT_DATE,
    updated_at = NOW()
  WHERE status = 'active';
  $$
);
