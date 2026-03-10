-- Migration 011: Atomic fill count check (fixes race condition in shift applications)

-- Replace increment_filled_count with atomic version that checks capacity
CREATE OR REPLACE FUNCTION try_increment_filled_count(shift_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Atomically increment filled_count only if below required_count
  UPDATE shift_requests
  SET filled_count = filled_count + 1,
      status = CASE
        WHEN filled_count + 1 >= required_count THEN 'closed'
        ELSE status
      END,
      updated_at = now()
  WHERE id = shift_id
    AND status = 'open'
    AND filled_count < required_count
  RETURNING filled_count INTO updated_count;

  -- If no row was updated, the shift is full or not open
  IF updated_count IS NULL THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;
