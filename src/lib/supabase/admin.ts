import { createClient } from "@supabase/supabase-js";

// Note: Use createClient<Database>() after `npm run db:types` generates
// optimized types from Supabase CLI
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
