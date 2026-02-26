-- =============================================
-- Dr.stretch SPOT - Initial Schema Migration
-- 14 tables for MVP
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. alumni_trainers - 退職トレーナーマスター
-- =============================================
CREATE TABLE alumni_trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_kana TEXT,
  phone TEXT,
  avatar_url TEXT,
  tenure_years NUMERIC(3,1) NOT NULL DEFAULT 0,
  employment_start_date DATE,
  employment_end_date DATE,
  preferred_areas TEXT[] DEFAULT '{}',
  preferred_time_slots TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  bio TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_type TEXT DEFAULT 'ordinary',
  bank_account_number TEXT,
  bank_account_holder TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  last_shift_date DATE,
  blank_status TEXT DEFAULT 'ok' CHECK (blank_status IN ('ok', 'alert_60', 'skill_check_required', 'training_required')),
  skill_check_completed_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. stores - 店舗マスター
-- =============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  geofence_radius_meters INTEGER DEFAULT 200,
  emergency_budget_monthly INTEGER DEFAULT 0,
  emergency_budget_used INTEGER DEFAULT 0,
  emergency_budget_reset_at DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. store_managers - 店舗管理者
-- =============================================
CREATE TABLE store_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'store_manager' CHECK (role IN ('store_manager', 'hr', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. shift_requests - シフト募集
-- =============================================
CREATE TABLE shift_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES store_managers(id),
  title TEXT NOT NULL,
  description TEXT,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  required_count INTEGER NOT NULL DEFAULT 1,
  filled_count INTEGER NOT NULL DEFAULT 0,
  required_certifications TEXT[] DEFAULT '{}',
  is_emergency BOOLEAN DEFAULT FALSE,
  emergency_bonus_amount INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'completed')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. shift_templates - シフトテンプレート
-- =============================================
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES store_managers(id),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  required_count INTEGER NOT NULL DEFAULT 1,
  required_certifications TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. shift_applications - シフト応募
-- =============================================
CREATE TABLE shift_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_request_id UUID NOT NULL REFERENCES shift_requests(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id) ON DELETE CASCADE,
  confirmed_rate INTEGER NOT NULL,
  rate_breakdown JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed', 'no_show')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES store_managers(id),
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_request_id, trainer_id)
);

-- =============================================
-- 7. attendance_records - 出退勤記録
-- =============================================
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID UNIQUE NOT NULL REFERENCES shift_applications(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  shift_date DATE NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  clock_in_latitude NUMERIC(10,7),
  clock_in_longitude NUMERIC(10,7),
  clock_out_latitude NUMERIC(10,7),
  clock_out_longitude NUMERIC(10,7),
  is_location_verified BOOLEAN DEFAULT FALSE,
  actual_work_minutes INTEGER,
  break_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'clocked_in', 'clocked_out', 'verified', 'disputed')),
  manager_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 8. skill_checks - スキルチェック記録
-- =============================================
CREATE TABLE skill_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id) ON DELETE CASCADE,
  checked_by UUID REFERENCES store_managers(id),
  check_type TEXT NOT NULL CHECK (check_type IN ('skill_check', 'training')),
  check_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'pending')),
  score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 9. evaluations - 勤務評価
-- =============================================
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID UNIQUE NOT NULL REFERENCES shift_applications(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  evaluator_id UUID NOT NULL REFERENCES store_managers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  categories JSONB DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 10. notification_preferences - 通知設定
-- =============================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID UNIQUE NOT NULL REFERENCES alumni_trainers(id) ON DELETE CASCADE,
  email_new_shift BOOLEAN DEFAULT TRUE,
  email_application_update BOOLEAN DEFAULT TRUE,
  email_blank_alert BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  preferred_notification_time TEXT DEFAULT '09:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 11. hourly_rate_config - 時給設定テーブル
-- =============================================
CREATE TABLE hourly_rate_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenure_min_years NUMERIC(3,1) NOT NULL,
  tenure_max_years NUMERIC(3,1),
  base_rate INTEGER NOT NULL,
  attendance_bonus_threshold INTEGER NOT NULL DEFAULT 5,
  attendance_bonus_amount INTEGER NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES store_managers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 12. blank_rule_config - ブランクルール設定
-- =============================================
CREATE TABLE blank_rule_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('alert_60', 'skill_check_required', 'training_required')),
  threshold_days INTEGER NOT NULL,
  action_required TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES store_managers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 13. rate_change_logs - 時給変更履歴（監査ログ）
-- =============================================
CREATE TABLE rate_change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  changed_by UUID NOT NULL REFERENCES store_managers(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('rate_update', 'rate_create', 'rate_delete', 'blank_rule_update', 'simulation')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  affected_trainers_count INTEGER DEFAULT 0,
  estimated_cost_impact NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 14. profiles (auth metadata) - ユーザープロファイル基本情報
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('trainer', 'store_manager', 'hr', 'admin')),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_alumni_trainers_auth_user ON alumni_trainers(auth_user_id);
CREATE INDEX idx_alumni_trainers_status ON alumni_trainers(status);
CREATE INDEX idx_alumni_trainers_blank_status ON alumni_trainers(blank_status);
CREATE INDEX idx_store_managers_auth_user ON store_managers(auth_user_id);
CREATE INDEX idx_store_managers_store ON store_managers(store_id);
CREATE INDEX idx_shift_requests_store ON shift_requests(store_id);
CREATE INDEX idx_shift_requests_date ON shift_requests(shift_date);
CREATE INDEX idx_shift_requests_status ON shift_requests(status);
CREATE INDEX idx_shift_applications_shift ON shift_applications(shift_request_id);
CREATE INDEX idx_shift_applications_trainer ON shift_applications(trainer_id);
CREATE INDEX idx_shift_applications_status ON shift_applications(status);
CREATE INDEX idx_attendance_records_trainer ON attendance_records(trainer_id);
CREATE INDEX idx_attendance_records_store ON attendance_records(store_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(shift_date);
CREATE INDEX idx_evaluations_trainer ON evaluations(trainer_id);
CREATE INDEX idx_evaluations_store ON evaluations(store_id);
CREATE INDEX idx_hourly_rate_config_active ON hourly_rate_config(is_active, effective_from);
CREATE INDEX idx_rate_change_logs_changed_by ON rate_change_logs(changed_by);
CREATE INDEX idx_rate_change_logs_created_at ON rate_change_logs(created_at);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================
-- Updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_alumni_trainers BEFORE UPDATE ON alumni_trainers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_stores BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_store_managers BEFORE UPDATE ON store_managers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shift_requests BEFORE UPDATE ON shift_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shift_templates BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shift_applications BEFORE UPDATE ON shift_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_attendance_records BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_skill_checks BEFORE UPDATE ON skill_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_evaluations BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_notification_preferences BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_hourly_rate_config BEFORE UPDATE ON hourly_rate_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_blank_rule_config BEFORE UPDATE ON blank_rule_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
