-- =============================================
-- Dr.stretch SPOT - HR Shift Offers
-- Allow HR/admin to create shift offers directly (without availability)
-- =============================================

-- 1. Make availability_id nullable (HR offers have no availability)
ALTER TABLE shift_offers ALTER COLUMN availability_id DROP NOT NULL;

-- 2. Make created_by nullable (HR users are not in store_managers)
ALTER TABLE shift_offers ALTER COLUMN created_by DROP NOT NULL;

-- 3. Add HR user reference
ALTER TABLE shift_offers ADD COLUMN IF NOT EXISTS created_by_hr_id UUID REFERENCES profiles(id);

-- 4. Extend shift_requests.source to include 'hr_offer'
ALTER TABLE shift_requests DROP CONSTRAINT IF EXISTS shift_requests_source_check;
ALTER TABLE shift_requests ADD CONSTRAINT shift_requests_source_check
  CHECK (source IN ('store_created', 'direct_offer', 'hr_offer'));

-- 5. Make shift_requests.created_by nullable (HR-initiated requests)
ALTER TABLE shift_requests ALTER COLUMN created_by DROP NOT NULL;

-- 6. Add HR reference to shift_requests
ALTER TABLE shift_requests ADD COLUMN IF NOT EXISTS created_by_hr_id UUID REFERENCES profiles(id);

-- 7. RLS: HR/admin can insert shift_offers
CREATE POLICY "hr_insert_offers" ON shift_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
  );

-- 8. Index for HR offers
CREATE INDEX IF NOT EXISTS idx_shift_offers_hr_created
  ON shift_offers(created_by_hr_id) WHERE created_by_hr_id IS NOT NULL;
