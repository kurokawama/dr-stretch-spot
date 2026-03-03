-- =============================================
-- Dr.stretch SPOT - Shift Availability & Direct Offer
-- New tables: shift_availabilities, shift_offers
-- Altered table: shift_requests (source, offer_id)
-- =============================================

-- =============================================
-- 1. New Tables
-- =============================================

-- shift_availabilities - Trainer declares when/where they can work
CREATE TABLE IF NOT EXISTS shift_availabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'offered', 'matched', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shift_offers - Store manager sends direct offer to trainer
CREATE TABLE IF NOT EXISTS shift_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  availability_id UUID NOT NULL REFERENCES shift_availabilities(id),
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  created_by UUID NOT NULL REFERENCES store_managers(id),
  title TEXT NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 60,
  offered_rate INTEGER NOT NULL,
  rate_breakdown JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. Alter shift_requests - add source tracking
-- =============================================

ALTER TABLE shift_requests
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'store_created'
    CHECK (source IN ('store_created', 'direct_offer'));

ALTER TABLE shift_requests
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES shift_offers(id);

-- =============================================
-- 3. Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_shift_availabilities_trainer
  ON shift_availabilities(trainer_id);
CREATE INDEX IF NOT EXISTS idx_shift_availabilities_store
  ON shift_availabilities(store_id);
CREATE INDEX IF NOT EXISTS idx_shift_availabilities_date
  ON shift_availabilities(available_date);
CREATE INDEX IF NOT EXISTS idx_shift_availabilities_status
  ON shift_availabilities(status);

CREATE INDEX IF NOT EXISTS idx_shift_offers_trainer
  ON shift_offers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_shift_offers_store
  ON shift_offers(store_id);
CREATE INDEX IF NOT EXISTS idx_shift_offers_availability
  ON shift_offers(availability_id);
CREATE INDEX IF NOT EXISTS idx_shift_offers_status
  ON shift_offers(status);

-- =============================================
-- 4. RLS Policies
-- =============================================

ALTER TABLE shift_availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_offers ENABLE ROW LEVEL SECURITY;

-- shift_availabilities policies
CREATE POLICY "Trainers can view own availabilities"
  ON shift_availabilities FOR SELECT
  USING (trainer_id IN (
    SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Trainers can insert own availabilities"
  ON shift_availabilities FOR INSERT
  WITH CHECK (trainer_id IN (
    SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Trainers can update own availabilities"
  ON shift_availabilities FOR UPDATE
  USING (trainer_id IN (
    SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Store managers can view availabilities for their store"
  ON shift_availabilities FOR SELECT
  USING (store_id IN (
    SELECT store_id FROM store_managers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "HR and admin can view all availabilities"
  ON shift_availabilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'admin', 'area_manager')
    )
  );

-- shift_offers policies
CREATE POLICY "Trainers can view own offers"
  ON shift_offers FOR SELECT
  USING (trainer_id IN (
    SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Trainers can update own offers (respond)"
  ON shift_offers FOR UPDATE
  USING (trainer_id IN (
    SELECT id FROM alumni_trainers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Store managers can view offers for their store"
  ON shift_offers FOR SELECT
  USING (store_id IN (
    SELECT store_id FROM store_managers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Store managers can insert offers for their store"
  ON shift_offers FOR INSERT
  WITH CHECK (store_id IN (
    SELECT store_id FROM store_managers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "HR and admin can view all offers"
  ON shift_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'admin', 'area_manager')
    )
  );

-- =============================================
-- 5. Updated_at triggers
-- =============================================

CREATE OR REPLACE TRIGGER set_shift_availabilities_updated_at
  BEFORE UPDATE ON shift_availabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_shift_offers_updated_at
  BEFORE UPDATE ON shift_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
