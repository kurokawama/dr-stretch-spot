-- =============================================
-- Migration 005: Matching & Attendance Flow
-- Adds QR tokens, notification logs, shift approval workflow,
-- auto-confirm matching, area manager support
-- =============================================

-- 1. Extend shift_requests: add approval workflow
ALTER TABLE shift_requests
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES store_managers(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_areas TEXT[] DEFAULT '{}';

-- Update status check constraint to include 'pending_approval'
ALTER TABLE shift_requests DROP CONSTRAINT IF EXISTS shift_requests_status_check;
ALTER TABLE shift_requests ADD CONSTRAINT shift_requests_status_check
  CHECK (status IN ('pending_approval', 'open', 'closed', 'cancelled', 'completed'));

-- Update existing 'open' records to stay as 'open' (already approved)

-- 2. Extend shift_applications: add reminder tracking
ALTER TABLE shift_applications
  ADD COLUMN IF NOT EXISTS pre_day_reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_day_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_day_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS day_reminder_sent BOOLEAN DEFAULT false;

-- 3. Extend stores: add auto_confirm setting
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN DEFAULT true;

-- 4. Create QR tokens table
CREATE TABLE IF NOT EXISTS qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_id UUID NOT NULL REFERENCES shift_applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('clock_in', 'clock_out')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_matching ON qr_tokens(matching_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires ON qr_tokens(expires_at) WHERE used_at IS NULL;

-- 5. Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('email', 'push', 'line')),
  category TEXT NOT NULL CHECK (category IN (
    'shift_published', 'application_received', 'application_confirmed',
    'application_rejected', 'application_cancelled',
    'pre_day_reminder', 'day_reminder',
    'clock_in', 'clock_out',
    'shift_approval_request', 'shift_approved',
    'blank_alert'
  )),
  matching_id UUID REFERENCES shift_applications(id),
  shift_request_id UUID REFERENCES shift_requests(id),
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT false,
  responded BOOLEAN DEFAULT false,
  responded_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_category ON notification_logs(category);
CREATE INDEX IF NOT EXISTS idx_notification_logs_matching ON notification_logs(matching_id);

-- 6. Extend store_managers role to include area_manager
ALTER TABLE store_managers DROP CONSTRAINT IF EXISTS store_managers_role_check;
ALTER TABLE store_managers ADD CONSTRAINT store_managers_role_check
  CHECK (role IN ('store_manager', 'hr', 'admin', 'area_manager'));

-- 7. Add area_manager to profiles role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('trainer', 'store_manager', 'hr', 'admin', 'area_manager'));

-- 8. Area manager: add managed_areas to store_managers for area filtering
ALTER TABLE store_managers
  ADD COLUMN IF NOT EXISTS managed_areas TEXT[] DEFAULT '{}';

-- 9. RLS Policies for new tables

-- QR Tokens: trainers can read their own, store managers can read store's
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own QR tokens"
  ON qr_tokens FOR SELECT
  USING (
    matching_id IN (
      SELECT id FROM shift_applications
      WHERE trainer_id IN (
        SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Store managers can read store QR tokens"
  ON qr_tokens FOR SELECT
  USING (
    matching_id IN (
      SELECT sa.id FROM shift_applications sa
      JOIN shift_requests sr ON sa.shift_request_id = sr.id
      WHERE sr.store_id IN (
        SELECT store_id FROM store_managers WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage QR tokens"
  ON qr_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Notification Logs: users can read their own
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage notifications"
  ON notification_logs FOR ALL
  USING (auth.role() = 'service_role');

-- 10. HR/Admin can read all QR tokens and notifications
CREATE POLICY "HR and admin can read all QR tokens"
  ON qr_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin', 'area_manager')
    )
  );

CREATE POLICY "HR and admin can read all notifications"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin', 'area_manager')
    )
  );

-- 11. Function to auto-close shift when filled
CREATE OR REPLACE FUNCTION auto_close_filled_shift()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE shift_requests
    SET status = 'closed',
        updated_at = now()
    WHERE id = NEW.shift_request_id
      AND filled_count >= required_count
      AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_close_shift ON shift_applications;
CREATE TRIGGER trigger_auto_close_shift
  AFTER UPDATE ON shift_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_filled_shift();
