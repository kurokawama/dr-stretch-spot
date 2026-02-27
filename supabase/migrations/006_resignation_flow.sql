-- =============================================
-- Migration 006: Resignation Flow + SPOT Status
-- =============================================

-- 1. Add 'employee' to profiles role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('trainer', 'store_manager', 'hr', 'admin', 'area_manager', 'employee'));

-- 2. Add spot_status to alumni_trainers
ALTER TABLE alumni_trainers ADD COLUMN IF NOT EXISTS spot_status TEXT
  CHECK (spot_status IN ('registered', 'active', 'inactive', 'paused'))
  DEFAULT 'active';

-- Set existing trainers to 'active' (they already registered for SPOT)
UPDATE alumni_trainers SET spot_status = 'active' WHERE spot_status IS NULL;

-- 3. Add resignation_id to alumni_trainers
ALTER TABLE alumni_trainers ADD COLUMN IF NOT EXISTS resignation_id UUID;

-- 4. Create resignation_requests table
CREATE TABLE IF NOT EXISTS resignation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users NOT NULL,
  employee_number TEXT,
  store_id UUID REFERENCES stores,
  full_name TEXT NOT NULL,
  full_name_kana TEXT,
  phone TEXT,
  employment_start_date DATE,
  desired_resignation_date DATE NOT NULL,
  last_working_date DATE,
  resignation_reason TEXT CHECK (resignation_reason IN (
    'career_change', 'family', 'health', 'independence', 'relocation', 'other'
  )),
  resignation_reason_detail TEXT,
  status TEXT CHECK (status IN ('draft', 'submitted', 'received', 'accepted', 'completed', 'cancelled')) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  received_by UUID REFERENCES auth.users,
  received_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users,
  completed_at TIMESTAMPTZ,
  spot_interest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS for resignation_requests
ALTER TABLE resignation_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view/create their own resignations
CREATE POLICY "Users can view own resignations" ON resignation_requests
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own resignations" ON resignation_requests
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own draft resignations" ON resignation_requests
  FOR UPDATE USING (auth.uid() = auth_user_id AND status = 'draft');

-- HR/Admin can view all resignations
CREATE POLICY "HR can view all resignations" ON resignation_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'admin', 'area_manager')
    )
  );

-- HR/Admin can update resignations (receive/accept/complete)
CREATE POLICY "HR can update resignations" ON resignation_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'admin')
    )
  );

-- 6. Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_resignation_requests_auth_user
  ON resignation_requests(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_status
  ON resignation_requests(status);
CREATE INDEX IF NOT EXISTS idx_alumni_trainers_spot_status
  ON alumni_trainers(spot_status);
