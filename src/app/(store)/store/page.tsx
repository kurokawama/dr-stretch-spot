import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus } from "lucide-react";

export default async function StoreDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id, store:stores(name, address, area)")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/login");

  const store = manager.store as unknown as {
    name: string;
    address: string;
    area: string;
  } | null;
  const today = new Date().toISOString().split("T")[0];

  // Today's shifts
  const { data: todayShifts, count: todayCount } = await supabase
    .from("shift_requests")
    .select("*", { count: "exact" })
    .eq("store_id", manager.store_id)
    .eq("shift_date", today)
    .limit(5);

  // Pending applications
  const { count: pendingCount } = await supabase
    .from("shift_applications")
    .select("*, shift_request:shift_requests!inner(store_id)", {
      count: "exact",
      head: true,
    })
    .eq("status", "pending")
    .eq("shift_request.store_id", manager.store_id);

  // Today's attendance
  const { count: attendanceCount } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .eq("shift_date", today);

  // Shift availabilities for this store
  const { count: availabilityCount } = await supabase
    .from("shift_availabilities")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .in("status", ["open", "offered"])
    .gte("available_date", today);

  // Monthly stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  const { count: monthlyShiftCount } = await supabase
    .from("shift_requests")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .gte("shift_date", monthStart);

  const { count: monthlyAttendance } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .gte("shift_date", monthStart);

  // Upcoming shifts (next 7 days)
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const { data: upcomingShifts } = await supabase
    .from("shift_requests")
    .select("id, title, shift_date, start_time, end_time, required_count, filled_count, status")
    .eq("store_id", manager.store_id)
    .gte("shift_date", today)
    .lte("shift_date", weekEndStr)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(10);

  const totalRequiredToday = (todayShifts ?? []).reduce(
    (sum, shift) => sum + (shift.required_count ?? 0),
    0
  );
  const totalFilledToday = (todayShifts ?? []).reduce(
    (sum, shift) => sum + (shift.filled_count ?? 0),
    0
  );
  const coverageRate =
    totalRequiredToday > 0
      ? Math.round((totalFilledToday / totalRequiredToday) * 100)
      : 0;

  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (Math.min(100, Math.max(0, coverageRate)) / 100) * ringCircumference;
  const isCoverageHigh = coverageRate >= 80;

  const pendingTrendHeights = Array.from({ length: 7 }, (_, index) => {
    const normalized = (pendingCount ?? 0) + index;
    return ["h-2", "h-3", "h-5", "h-7"][Math.min(normalized % 4, 3)];
  });

  const monthlyTrendHeights = Array.from({ length: 8 }, (_, index) => {
    const normalized = (monthlyAttendance ?? 0) + index;
    return ["h-2", "h-3", "h-4", "h-6"][Math.min(normalized % 4, 3)];
  });

  const recentActivities = [
    ...(todayCount && todayCount > 0
      ? [{ time: "現在", detail: `本日のシフト ${todayCount}件` }]
      : []),
    ...(attendanceCount && attendanceCount > 0
      ? [{ time: "現在", detail: `本日の出勤者 ${attendanceCount}名` }]
      : []),
    ...(pendingCount && pendingCount > 0
      ? [{ time: "現在", detail: `${pendingCount}件の応募が審査待ちです` }]
      : []),
    ...(upcomingShifts ?? []).slice(0, 3).map((shift) => ({
      time: `${shift.shift_date} ${shift.start_time?.slice(0, 5)}`,
      detail: shift.title,
    })),
    ...(availabilityCount && availabilityCount > 0
      ? [{ time: "現在", detail: `シフト希望 ${availabilityCount}件` }]
      : []),
  ];

  const resolveShiftStatus = (shift: {
    status: string;
    required_count: number;
    filled_count: number;
  }) => {
    if (shift.status === "cancelled") {
      return {
        label: "キャンセル",
        className: "bg-red-100 text-red-800",
      };
    }
    if (shift.status === "closed") {
      return {
        label: "完了",
        className: "bg-gray-100 text-gray-800",
      };
    }
    if (shift.filled_count >= shift.required_count) {
      return {
        label: "充足",
        className: "bg-green-100 text-green-800",
      };
    }
    return {
      label: "募集中",
      className: "bg-yellow-100 text-yellow-800",
    };
  };

  return (
    <div className="animate-fade-in-up space-y-6 bg-[#FCFCFC] p-4 md:p-6">
      {/* Store Info Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">ダッシュボード</h1>
        {store && (
          <div className="mt-1 space-y-0.5">
            <p className="text-sm text-muted-foreground">{store.name}</p>
            {store.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {store.address}
              </p>
            )}
            {store.area && (
              <Badge className="mt-1 rounded-full border border-input bg-white text-xs font-medium text-foreground">
                {store.area}エリア
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-lg border border-t-4 border-t-primary bg-card shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">本日のカバー率</p>
              <p className="font-heading text-3xl font-bold tabular-nums">{coverageRate}%</p>
              <p className="text-xs text-muted-foreground">
                {totalFilledToday}/{totalRequiredToday || 0}名
              </p>
            </div>
            <div className="relative h-20 w-20">
              <svg className="h-20 w-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="8"
                  className="stroke-muted"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={0}
                />
                <circle
                  cx="40"
                  cy="40"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className={isCoverageHigh ? "stroke-green-500" : "stroke-primary"}
                />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-t-4 border-t-primary bg-card shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div>
              <p className="text-sm text-muted-foreground">未対応の応募</p>
              <p className="font-heading text-3xl font-bold tabular-nums">{pendingCount ?? 0}</p>
            </div>
            <div className="flex items-end gap-1">
              {pendingTrendHeights.map((heightClass, index) => (
                <div
                  key={`${heightClass}-${index}`}
                  className={`w-2 rounded-full bg-primary/70 ${heightClass}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-t-4 border-t-primary bg-card shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div>
              <p className="text-sm text-muted-foreground">今月の利用回数</p>
              <p className="font-heading text-3xl font-bold tabular-nums">{monthlyAttendance ?? 0}</p>
              <p className="text-xs text-muted-foreground">シフト数 {monthlyShiftCount ?? 0}</p>
            </div>
            <div className="flex items-end gap-1">
              {monthlyTrendHeights.map((heightClass, index) => (
                <div
                  key={`${heightClass}-${index}`}
                  className={`w-2 rounded-full bg-[#DADF00]/80 ${heightClass}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts Table */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base font-semibold">
              今週のシフト
            </CardTitle>
            <Button
              asChild
              size="sm"
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/store/shifts/new">
                <Plus className="mr-1 h-4 w-4" />
                新規作成
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!upcomingShifts || upcomingShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              今後7日間の予定はありません
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr className="border-b">
                    <th className="px-3 py-2 font-medium">日付</th>
                    <th className="px-3 py-2 font-medium">時間</th>
                    <th className="px-3 py-2 font-medium text-right">必要人数</th>
                    <th className="px-3 py-2 font-medium text-right">応募数</th>
                    <th className="px-3 py-2 font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingShifts.map((shift, index) => {
                    const status = resolveShiftStatus(shift);
                    return (
                      <tr
                        key={shift.id}
                        className={`border-b last:border-b-0 hover:bg-muted/50 ${
                          index % 2 === 0 ? "bg-white" : "bg-muted/20"
                        }`}
                      >
                        <td className="px-3 py-3 align-middle">{shift.shift_date}</td>
                        <td className="px-3 py-3 align-middle">
                          {shift.start_time?.slice(0, 5)}〜{shift.end_time?.slice(0, 5)}
                        </td>
                        <td className="px-3 py-3 text-right align-middle">{shift.required_count}名</td>
                        <td className="px-3 py-3 text-right align-middle">{shift.filled_count}名</td>
                        <td className="px-3 py-3 align-middle">
                          <Badge
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">最近のアクティビティ</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">今後7日間の予定はありません</p>
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((activity, index) => (
                <li
                  key={`${activity.time}-${activity.detail}-${index}`}
                  className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="min-w-28 text-xs text-muted-foreground">{activity.time}</span>
                  <p className="text-sm">{activity.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
