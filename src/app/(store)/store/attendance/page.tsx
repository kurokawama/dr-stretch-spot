import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceList } from "./AttendanceList";
import type { AttendanceStatus } from "@/types/database";

interface AttendanceListItem {
  id: string;
  status: AttendanceStatus;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  trainer: {
    full_name: string;
  } | null;
}

function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    "0"
  )}-${`${date.getDate()}`.padStart(2, "0")}`;
}

export default async function StoreAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: manager } = await supabase
    .from("store_managers")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold">出勤管理</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            店舗情報を取得できませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = getTodayKey();
  const { data: attendanceItems } = await supabase
    .from("attendance_records")
    .select(
      "id, status, shift_date, scheduled_start, scheduled_end, clock_in_at, clock_out_at, trainer:alumni_trainers(full_name)"
    )
    .eq("store_id", manager.store_id)
    .eq("shift_date", today)
    .order("scheduled_start");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">出勤管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          退勤済みの勤怠を確認して確定できます。
        </p>
      </div>
      <AttendanceList initialItems={(attendanceItems ?? []) as AttendanceListItem[]} />
    </div>
  );
}
