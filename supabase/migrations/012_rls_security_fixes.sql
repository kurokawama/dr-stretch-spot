-- =============================================
-- Dr.stretch SPOT - RLS Security Fixes
-- Based on: rls-security-review-2026-03-18 v2
-- =============================================
-- This migration fixes:
--   Critical #1: profiles — role self-escalation
--   Critical #2: shift_applications — status arbitrary change
--   Critical #3: alumni_trainers — status/blank_status self-change
--   Critical S-3: attendance_records — clock time tampering
--   High P-1/P-2: auth.uid() per-row evaluation (performance)
--   Medium #4: HR cannot UPDATE shift_requests
--   Medium #5: shift_requests INSERT missing WITH CHECK
--   Medium #6: area_manager shift management policy missing
--   Medium #7: shift_templates HR/Admin read policy missing
--   Medium S-5: FORCE ROW LEVEL SECURITY not set
--   Low #8/S-2: SECURITY DEFINER missing SET search_path
-- =============================================

-- =============================================
-- CRITICAL FIX #1: profiles — prevent role self-escalation
-- =============================================
-- Drop old policy without WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- New policy: user can update own profile but CANNOT change role
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT role FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- =============================================
-- CRITICAL FIX #2: shift_applications — restrict status changes
-- =============================================
-- Drop old policy without WITH CHECK
DROP POLICY IF EXISTS "Trainers can cancel own applications" ON shift_applications;

-- Trainers can ONLY cancel their own pending applications
CREATE POLICY "Trainers can cancel own applications"
  ON shift_applications FOR UPDATE
  USING (
    trainer_id = (SELECT get_trainer_id((SELECT auth.uid())))
    AND status = 'pending'
  )
  WITH CHECK (
    trainer_id = (SELECT get_trainer_id((SELECT auth.uid())))
    AND status = 'cancelled'
  );

-- =============================================
-- CRITICAL FIX #3: alumni_trainers — restrict HR-managed fields
-- =============================================
-- Drop old permissive policy
DROP POLICY IF EXISTS "Trainers can update own record" ON alumni_trainers;

-- Trainers can only update personal info fields (NOT status/blank_status/HR fields)
CREATE POLICY "Trainers can update own personal info"
  ON alumni_trainers FOR UPDATE
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (
    auth_user_id = (SELECT auth.uid())
    -- HR-managed fields must remain unchanged
    AND status = (SELECT status FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
    AND blank_status = (SELECT blank_status FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
    AND skill_check_completed_at IS NOT DISTINCT FROM (SELECT skill_check_completed_at FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
    AND training_completed_at IS NOT DISTINCT FROM (SELECT training_completed_at FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
    AND tenure_years = (SELECT tenure_years FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
    AND employment_start_date IS NOT DISTINCT FROM (SELECT employment_start_date FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
    AND employment_end_date IS NOT DISTINCT FROM (SELECT employment_end_date FROM alumni_trainers WHERE auth_user_id = (SELECT auth.uid()))
  );

-- =============================================
-- CRITICAL FIX S-3: attendance_records — prevent clock time tampering
-- =============================================
-- Drop old policy without WITH CHECK
DROP POLICY IF EXISTS "Trainers can clock in/out" ON attendance_records;

-- Trainers can only set clock_in/clock_out from NULL (no overwrite)
-- Once punched, only manager/HR can correct
CREATE POLICY "Trainers can clock in/out (null to value only)"
  ON attendance_records FOR UPDATE
  USING (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))))
  WITH CHECK (
    trainer_id = (SELECT get_trainer_id((SELECT auth.uid())))
    -- store_id and application_id cannot be changed
    AND store_id = store_id
    AND application_id = application_id
    -- clock_in: only NULL -> value allowed (no overwrite)
    AND (
      clock_in_at IS NOT DISTINCT FROM (SELECT clock_in_at FROM attendance_records WHERE id = attendance_records.id)
      OR (SELECT clock_in_at FROM attendance_records WHERE id = attendance_records.id) IS NULL
    )
    -- clock_out: only NULL -> value allowed (no overwrite)
    AND (
      clock_out_at IS NOT DISTINCT FROM (SELECT clock_out_at FROM attendance_records WHERE id = attendance_records.id)
      OR (SELECT clock_out_at FROM attendance_records WHERE id = attendance_records.id) IS NULL
    )
  );

-- =============================================
-- PERFORMANCE FIX P-1/P-2: Wrap auth.uid() in SELECT for caching
-- =============================================
-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- alumni_trainers
DROP POLICY IF EXISTS "Trainers can read own record" ON alumni_trainers;
CREATE POLICY "Trainers can read own record"
  ON alumni_trainers FOR SELECT
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Store managers can read trainers" ON alumni_trainers;
CREATE POLICY "Store managers can read trainers"
  ON alumni_trainers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('store_manager', 'hr', 'admin'))
  );

DROP POLICY IF EXISTS "HR/Admin can manage trainers" ON alumni_trainers;
CREATE POLICY "HR/Admin can manage trainers"
  ON alumni_trainers FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- stores
DROP POLICY IF EXISTS "Anyone authenticated can read stores" ON stores;
CREATE POLICY "Anyone authenticated can read stores"
  ON stores FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "HR/Admin can manage stores" ON stores;
CREATE POLICY "HR/Admin can manage stores"
  ON stores FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- store_managers
DROP POLICY IF EXISTS "Managers can read own record" ON store_managers;
CREATE POLICY "Managers can read own record"
  ON store_managers FOR SELECT
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "HR/Admin can manage store managers" ON store_managers;
CREATE POLICY "HR/Admin can manage store managers"
  ON store_managers FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- shift_requests
DROP POLICY IF EXISTS "Trainers can read open shifts" ON shift_requests;
CREATE POLICY "Trainers can read open shifts"
  ON shift_requests FOR SELECT
  USING (
    status = 'open' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'trainer')
  );

DROP POLICY IF EXISTS "Store managers can manage own store shifts" ON shift_requests;
CREATE POLICY "Store managers can manage own store shifts"
  ON shift_requests FOR ALL
  USING (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))))
  WITH CHECK (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))));

-- MEDIUM FIX #4: HR can now manage all shifts (was SELECT only)
DROP POLICY IF EXISTS "HR/Admin can read all shifts" ON shift_requests;
CREATE POLICY "HR/Admin can manage all shifts"
  ON shift_requests FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- shift_templates
DROP POLICY IF EXISTS "Store managers can manage own templates" ON shift_templates;
CREATE POLICY "Store managers can manage own templates"
  ON shift_templates FOR ALL
  USING (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))))
  WITH CHECK (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))));

-- MEDIUM FIX #7: HR/Admin can read all shift templates
CREATE POLICY "HR/Admin can read all templates"
  ON shift_templates FOR SELECT
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- shift_applications
DROP POLICY IF EXISTS "Trainers can read own applications" ON shift_applications;
CREATE POLICY "Trainers can read own applications"
  ON shift_applications FOR SELECT
  USING (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Trainers can create applications" ON shift_applications;
CREATE POLICY "Trainers can create applications"
  ON shift_applications FOR INSERT
  WITH CHECK (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Store managers can manage applications for their shifts" ON shift_applications;
CREATE POLICY "Store managers can manage applications for their shifts"
  ON shift_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shift_requests sr
      WHERE sr.id = shift_applications.shift_request_id
      AND sr.store_id = (SELECT get_manager_store_id((SELECT auth.uid())))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shift_requests sr
      WHERE sr.id = shift_applications.shift_request_id
      AND sr.store_id = (SELECT get_manager_store_id((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "HR/Admin can read all applications" ON shift_applications;
CREATE POLICY "HR/Admin can manage all applications"
  ON shift_applications FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- attendance_records
DROP POLICY IF EXISTS "Trainers can read own attendance" ON attendance_records;
CREATE POLICY "Trainers can read own attendance"
  ON attendance_records FOR SELECT
  USING (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Store managers can manage attendance for own store" ON attendance_records;
CREATE POLICY "Store managers can manage attendance for own store"
  ON attendance_records FOR ALL
  USING (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))))
  WITH CHECK (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "HR/Admin can read all attendance" ON attendance_records;
CREATE POLICY "HR/Admin can manage all attendance"
  ON attendance_records FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- skill_checks
DROP POLICY IF EXISTS "Trainers can read own skill checks" ON skill_checks;
CREATE POLICY "Trainers can read own skill checks"
  ON skill_checks FOR SELECT
  USING (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Store managers can manage skill checks" ON skill_checks;
CREATE POLICY "Store managers can manage skill checks"
  ON skill_checks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('store_manager', 'hr', 'admin'))
  );

-- evaluations
DROP POLICY IF EXISTS "Trainers can read own evaluations" ON evaluations;
CREATE POLICY "Trainers can read own evaluations"
  ON evaluations FOR SELECT
  USING (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "Store managers can manage evaluations for own store" ON evaluations;
CREATE POLICY "Store managers can manage evaluations for own store"
  ON evaluations FOR ALL
  USING (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))))
  WITH CHECK (store_id = (SELECT get_manager_store_id((SELECT auth.uid()))));

DROP POLICY IF EXISTS "HR/Admin can read all evaluations" ON evaluations;
CREATE POLICY "HR/Admin can manage all evaluations"
  ON evaluations FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- notification_preferences
DROP POLICY IF EXISTS "Trainers can manage own notification prefs" ON notification_preferences;
CREATE POLICY "Trainers can manage own notification prefs"
  ON notification_preferences FOR ALL
  USING (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))))
  WITH CHECK (trainer_id = (SELECT get_trainer_id((SELECT auth.uid()))));

-- hourly_rate_config
DROP POLICY IF EXISTS "Anyone authenticated can read rate config" ON hourly_rate_config;
CREATE POLICY "Anyone authenticated can read rate config"
  ON hourly_rate_config FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "HR/Admin can manage rate config" ON hourly_rate_config;
CREATE POLICY "HR/Admin can manage rate config"
  ON hourly_rate_config FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- blank_rule_config
DROP POLICY IF EXISTS "Anyone authenticated can read blank rules" ON blank_rule_config;
CREATE POLICY "Anyone authenticated can read blank rules"
  ON blank_rule_config FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "HR/Admin can manage blank rules" ON blank_rule_config;
CREATE POLICY "HR/Admin can manage blank rules"
  ON blank_rule_config FOR ALL
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))))
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- rate_change_logs
DROP POLICY IF EXISTS "HR/Admin can read change logs" ON rate_change_logs;
CREATE POLICY "HR/Admin can read change logs"
  ON rate_change_logs FOR SELECT
  USING ((SELECT is_hr_or_admin((SELECT auth.uid()))));

DROP POLICY IF EXISTS "HR/Admin can create change logs" ON rate_change_logs;
CREATE POLICY "HR/Admin can create change logs"
  ON rate_change_logs FOR INSERT
  WITH CHECK ((SELECT is_hr_or_admin((SELECT auth.uid()))));

-- =============================================
-- MEDIUM FIX S-5: FORCE ROW LEVEL SECURITY on all tables
-- =============================================
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE alumni_trainers FORCE ROW LEVEL SECURITY;
ALTER TABLE stores FORCE ROW LEVEL SECURITY;
ALTER TABLE store_managers FORCE ROW LEVEL SECURITY;
ALTER TABLE shift_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE shift_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE shift_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE skill_checks FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_config FORCE ROW LEVEL SECURITY;
ALTER TABLE blank_rule_config FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_change_logs FORCE ROW LEVEL SECURITY;

-- =============================================
-- LOW FIX #8/S-2: Add SET search_path to SECURITY DEFINER functions
-- =============================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_hr_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND role IN ('hr', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_trainer_id(user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.alumni_trainers WHERE auth_user_id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_manager_store_id(user_id UUID)
RETURNS UUID AS $$
  SELECT store_id FROM public.store_managers WHERE auth_user_id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- auto_close_filled_shift (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_close_filled_shift') THEN
    EXECUTE 'ALTER FUNCTION auto_close_filled_shift SET search_path = ''''';
  END IF;
END $$;
