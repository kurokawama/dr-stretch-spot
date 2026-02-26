-- =============================================
-- Dr.stretch SPOT - RPC Functions
-- =============================================

-- Increment filled_count atomically
CREATE OR REPLACE FUNCTION increment_filled_count(shift_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shift_requests
  SET filled_count = filled_count + 1
  WHERE id = shift_id;

  -- Auto-close if fully booked
  UPDATE shift_requests
  SET status = 'closed'
  WHERE id = shift_id
    AND filled_count >= required_count
    AND status = 'open';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
