import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateJP, formatTimeJP } from "@/lib/formatters";

function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    "0"
  )}-${`${date.getDate()}`.padStart(2, "0")}`;
}

export default async function StoreDashboardPage() {
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
      <div className="p-6">
        <h1 className="font-heading text-2xl font-bold">ダッシュボード</h1>
        <p className="mt-2 text-muted-foreground">
          店舗管理ダッシュボード（実装予定）
        </p>
      </div>
    );
  }

  const today = getTodayKey();
  const [todayShiftsResult, allShiftsResult] = await Promise.all([
    supabase
      .from("shift_requests")
      .select("id, title, shift_date, start_time, end_time, filled_count, required_count")
      .eq("store_id", manager.store_id)
      .eq("shift_date", today)
      .order("start_time"),
    supabase.from("shift_requests").select("id").eq("store_id", manager.store_id),
  ]);

  const todayShifts = todayShiftsResult.data ?? [];
  const shiftIds = (allShiftsResult.data ?? []).map((shift) => shift.id);

  const pendingCountResult =
    shiftIds.length > 0
      ? await supabase
          .from("shift_applications")
          .select("id", { count: "exact", head: true })
          .in("shift_request_id", shiftIds)
          .eq("status", "pending")
      : { count: 0 };

  const recentActivityResult =
    shiftIds.length > 0
      ? await supabase
          .from("shift_applications")
          .select(
            "id, status, applied_at, trainer:alumni_trainers(full_name), shift_request:shift_requests(title, shift_date, start_time)"
          )
          .in("shift_request_id", shiftIds)
          .order("applied_at", { ascending: false })
          .limit(6)
      : { data: [] };

  const pendingCount = pendingCountResult.count ?? 0;
  const recentActivities = recentActivityResult.data ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">ダッシュボード</h1>
        <p className="mt-2 text-muted-foreground">
          店舗管理ダッシュボード（実装予定）
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">本日のシフト</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{todayShifts.length}件</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">承認待ち応募</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-primary">
            {pendingCount}件
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">直近アクティビティ</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {recentActivities.length}件
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本日のシフト概要</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">本日の募集はありません。</p>
          ) : (
            todayShifts.map((shift) => (
              <div key={shift.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{shift.title}</p>
                  <Badge variant="outline">
                    {shift.filled_count}/{shift.required_count}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {formatDateJP(shift.shift_date)} {formatTimeJP(shift.start_time)} -{" "}
                  {formatTimeJP(shift.end_time)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近のアクティビティ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">最近の動きはありません。</p>
          ) : (
            recentActivities.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.trainer?.full_name ?? "トレーナー未設定"}</p>
                  <Badge variant={item.status === "pending" ? "outline" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {item.shift_request?.title ?? "シフト未設定"} /{" "}
                  {formatDateJP(item.shift_request?.shift_date ?? null)}{" "}
                  {formatTimeJP(item.shift_request?.start_time ?? null)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
