import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AttendanceList } from "./AttendanceList";

export default async function StoreAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Today's attendance records
  const { data: todayRecords } = await supabase
    .from("attendance_records")
    .select(`
      *,
      trainer:alumni_trainers(id, full_name, avatar_url)
    `)
    .eq("store_id", manager.store_id)
    .eq("shift_date", today)
    .order("scheduled_start", { ascending: true });

  // Recent records (last 7 days, excluding today)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: recentRecords } = await supabase
    .from("attendance_records")
    .select(`
      *,
      trainer:alumni_trainers(id, full_name, avatar_url)
    `)
    .eq("store_id", manager.store_id)
    .lt("shift_date", today)
    .gte("shift_date", weekAgoStr)
    .order("shift_date", { ascending: false })
    .order("scheduled_start", { ascending: true })
    .limit(30);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">出勤管理</h1>
      <AttendanceList
        todayRecords={todayRecords ?? []}
        recentRecords={recentRecords ?? []}
      />
    </div>
  );
}
