import { createBrowserClient } from "@supabase/ssr";

// Note: Database type is exported from @/types/database
// Use createClient<Database>() after running `npm run db:types` to generate
// optimized types from Supabase CLI (current hand-written types exceed TS
// template literal recursion limits when used as generic parameter)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
