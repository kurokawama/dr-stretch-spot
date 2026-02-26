-- =============================================
-- Dr.stretch SPOT - RLS Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE blank_rule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_change_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper function: get user role
-- =============================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is HR or Admin
CREATE OR REPLACE FUNCTION is_hr_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role IN ('hr', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get trainer ID from auth user
CREATE OR REPLACE FUNCTION get_trainer_id(user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM alumni_trainers WHERE auth_user_id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get store_manager record from auth user
CREATE OR REPLACE FUNCTION get_manager_store_id(user_id UUID)
RETURNS UUID AS $$
  SELECT store_id FROM store_managers WHERE auth_user_id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- profiles
-- =============================================
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- alumni_trainers
-- =============================================
CREATE POLICY "Trainers can read own record"
  ON alumni_trainers FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Trainers can update own record"
  ON alumni_trainers FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Store managers can read trainers"
  ON alumni_trainers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('store_manager', 'hr', 'admin'))
  );

CREATE POLICY "HR/Admin can manage trainers"
  ON alumni_trainers FOR ALL
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- stores
-- =============================================
CREATE POLICY "Anyone authenticated can read stores"
  ON stores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR/Admin can manage stores"
  ON stores FOR ALL
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- store_managers
-- =============================================
CREATE POLICY "Managers can read own record"
  ON store_managers FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "HR/Admin can manage store managers"
  ON store_managers FOR ALL
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- shift_requests
-- =============================================
CREATE POLICY "Trainers can read open shifts"
  ON shift_requests FOR SELECT
  USING (
    status = 'open' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "Store managers can manage own store shifts"
  ON shift_requests FOR ALL
  USING (
    store_id = get_manager_store_id(auth.uid())
  );

CREATE POLICY "HR/Admin can read all shifts"
  ON shift_requests FOR SELECT
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- shift_templates
-- =============================================
CREATE POLICY "Store managers can manage own templates"
  ON shift_templates FOR ALL
  USING (
    store_id = get_manager_store_id(auth.uid())
  );

-- =============================================
-- shift_applications
-- =============================================
CREATE POLICY "Trainers can read own applications"
  ON shift_applications FOR SELECT
  USING (trainer_id = get_trainer_id(auth.uid()));

CREATE POLICY "Trainers can create applications"
  ON shift_applications FOR INSERT
  WITH CHECK (trainer_id = get_trainer_id(auth.uid()));

CREATE POLICY "Trainers can cancel own applications"
  ON shift_applications FOR UPDATE
  USING (
    trainer_id = get_trainer_id(auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "Store managers can manage applications for their shifts"
  ON shift_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shift_requests sr
      WHERE sr.id = shift_applications.shift_request_id
      AND sr.store_id = get_manager_store_id(auth.uid())
    )
  );

CREATE POLICY "HR/Admin can read all applications"
  ON shift_applications FOR SELECT
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- attendance_records
-- =============================================
CREATE POLICY "Trainers can read own attendance"
  ON attendance_records FOR SELECT
  USING (trainer_id = get_trainer_id(auth.uid()));

CREATE POLICY "Trainers can clock in/out"
  ON attendance_records FOR UPDATE
  USING (trainer_id = get_trainer_id(auth.uid()));

CREATE POLICY "Store managers can manage attendance for own store"
  ON attendance_records FOR ALL
  USING (store_id = get_manager_store_id(auth.uid()));

CREATE POLICY "HR/Admin can read all attendance"
  ON attendance_records FOR SELECT
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- skill_checks
-- =============================================
CREATE POLICY "Trainers can read own skill checks"
  ON skill_checks FOR SELECT
  USING (trainer_id = get_trainer_id(auth.uid()));

CREATE POLICY "Store managers can manage skill checks"
  ON skill_checks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('store_manager', 'hr', 'admin'))
  );

-- =============================================
-- evaluations
-- =============================================
CREATE POLICY "Trainers can read own evaluations"
  ON evaluations FOR SELECT
  USING (trainer_id = get_trainer_id(auth.uid()));

CREATE POLICY "Store managers can manage evaluations for own store"
  ON evaluations FOR ALL
  USING (store_id = get_manager_store_id(auth.uid()));

CREATE POLICY "HR/Admin can read all evaluations"
  ON evaluations FOR SELECT
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- notification_preferences
-- =============================================
CREATE POLICY "Trainers can manage own notification prefs"
  ON notification_preferences FOR ALL
  USING (trainer_id = get_trainer_id(auth.uid()));

-- =============================================
-- hourly_rate_config
-- =============================================
CREATE POLICY "Anyone authenticated can read rate config"
  ON hourly_rate_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR/Admin can manage rate config"
  ON hourly_rate_config FOR ALL
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- blank_rule_config
-- =============================================
CREATE POLICY "Anyone authenticated can read blank rules"
  ON blank_rule_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR/Admin can manage blank rules"
  ON blank_rule_config FOR ALL
  USING (is_hr_or_admin(auth.uid()));

-- =============================================
-- rate_change_logs
-- =============================================
CREATE POLICY "HR/Admin can read change logs"
  ON rate_change_logs FOR SELECT
  USING (is_hr_or_admin(auth.uid()));

CREATE POLICY "HR/Admin can create change logs"
  ON rate_change_logs FOR INSERT
  WITH CHECK (is_hr_or_admin(auth.uid()));
