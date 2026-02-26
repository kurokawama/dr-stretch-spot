import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApplicationList } from "./ApplicationList";

export default async function StoreApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id, store:stores(name)")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/login");

  // Get pending applications for this store's shifts
  const { data: applications } = await supabase
    .from("shift_applications")
    .select(`
      *,
      trainer:alumni_trainers(id, full_name, tenure_years, blank_status, avatar_url),
      shift_request:shift_requests!inner(id, title, shift_date, start_time, end_time, store_id, is_emergency)
    `)
    .eq("shift_request.store_id", manager.store_id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">応募者管理</h1>
      <ApplicationList
        initialData={applications ?? []}
        storeId={manager.store_id}
      />
    </div>
  );
}
