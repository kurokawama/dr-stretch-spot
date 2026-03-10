import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { approveShiftRequest, rejectShiftRequest } from "@/actions/shifts";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HRDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user role for area filtering
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();

  // Get area manager's managed areas if applicable
  let managedAreas: string[] = [];
  if (profile?.role === "area_manager") {
    const { data: manager } = await admin
      .from("store_managers")
      .select("managed_areas")
      .eq("auth_user_id", user.id)
      .single();
    managedAreas = manager?.managed_areas ?? [];
  }

  // Pending approvals
  const { data: pendingShifts } = await admin
    .from("shift_requests")
    .select("*, store:stores(name, area, prefecture)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  let filteredPending = pendingShifts ?? [];
  if (managedAreas.length > 0) {
    filteredPending = filteredPending.filter((s) =>
      managedAreas.includes(s.store?.area ?? "")
    );
  }

  // Today's attendance
  const today = new Date().toISOString().split("T")[0];
  const { data: todayAttendance } = await admin
    .from("attendance_records")
    .select("*, trainer:alumni_trainers(full_name), store:stores(name, area)")
    .eq("shift_date", today)
    .order("scheduled_start");

  let filteredAttendance = todayAttendance ?? [];
  if (managedAreas.length > 0) {
    filteredAttendance = filteredAttendance.filter((a) =>
      managedAreas.includes(a.store?.area ?? "")
    );
  }

  // Tomorrow's attendance with pre-day confirmation
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const { data: tomorrowAttendance } = await admin
    .from("attendance_records")
    .select(
      "*, trainer:alumni_trainers(full_name, email), store:stores(name, area), application:shift_applications(pre_day_confirmed, pre_day_reminder_sent)"
    )
    .eq("shift_date", tomorrowStr)
    .order("scheduled_start");

  let filteredTomorrow = tomorrowAttendance ?? [];
  if (managedAreas.length > 0) {
    filteredTomorrow = filteredTomorrow.filter((a) =>
      managedAreas.includes(a.store?.area ?? "")
    );
  }

  const unconfirmedCount = filteredTomorrow.filter(
    (a) => !a.application?.pre_day_confirmed
  ).length;

  // Shift availabilities (all stores)
  const { data: allAvailabilities } = await admin
    .from("shift_availabilities")
    .select("*, trainer:alumni_trainers(full_name, tenure_years, rank), store:stores(name, area)")
    .in("status", ["open", "offered"])
    .gte("available_date", today)
    .order("available_date", { ascending: true })
    .limit(20);

  let filteredAvailabilities = allAvailabilities ?? [];
  if (managedAreas.length > 0) {
    filteredAvailabilities = filteredAvailabilities.filter((a) =>
      managedAreas.includes(a.store?.area ?? "")
    );
  }

  // Stats
  const clockedInCount = filteredAttendance.filter(
    (a) => a.status === "clocked_in"
  ).length;
  const scheduledCount = filteredAttendance.filter(
    (a) => a.status === "scheduled"
  ).length;
  const completedCount = filteredAttendance.filter(
    (a) => a.status === "clocked_out" || a.status === "verified"
  ).length;

  const attendanceStatusToSummary = (status: string): "approved" | "completed" | "cancelled" => {
    if (status === "clocked_out" || status === "verified") return "completed";
    if (status === "no_show") return "cancelled";
    return "approved";
  };

  const overviewRows = [
    ...filteredPending.map((shift) => ({
      id: `pending-${shift.id}`,
      trainerName: "—",
      storeName: shift.store?.name ?? "—",
      shiftDate: shift.shift_date,
      time: `${shift.start_time?.slice(0, 5)}〜${shift.end_time?.slice(0, 5)}`,
      rate: "—",
      status: "pending" as const,
      canApprove: true,
      shiftId: shift.id,
      area: shift.store?.area ?? "",
    })),
    ...filteredAttendance.map((record) => ({
      id: `attendance-${record.id}`,
      trainerName: record.trainer?.full_name ?? "—",
      storeName: record.store?.name ?? "—",
      shiftDate: record.shift_date,
      time: `${record.scheduled_start?.slice(0, 5)}〜${record.scheduled_end?.slice(0, 5)}`,
      rate: "—",
      status: attendanceStatusToSummary(record.status),
      canApprove: false,
      shiftId: "",
      area: record.store?.area ?? "",
    })),
  ].sort((a, b) => (a.shiftDate < b.shiftDate ? 1 : -1));

  const totalMatchingCount = overviewRows.length;
  const pendingSummaryCount = overviewRows.filter((row) => row.status === "pending").length;
  const cancelCount = overviewRows.filter((row) => row.status === "cancelled").length;
  const fillRate =
    filteredAttendance.length > 0
      ? Math.round(((clockedInCount + completedCount) / filteredAttendance.length) * 100)
      : 0;
  const cancelRate =
    totalMatchingCount > 0 ? Math.round((cancelCount / totalMatchingCount) * 100) : 0;

  const paginatedRows = overviewRows.slice(0, 10);
  const areaOptions = Array.from(new Set(overviewRows.map((row) => row.area).filter(Boolean)));

  const getStatusBadgeClass = (status: string) => {
    if (status === "approved") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    if (status === "cancelled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    if (status === "approved") return "承認済";
    if (status === "pending") return "承認待ち";
    if (status === "cancelled") return "キャンセル";
    return "完了";
  };

  return (
    <div className="animate-fade-in-up space-y-6 bg-background p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          {profile?.role === "area_manager"
            ? "エリアマネージャー ダッシュボード"
            : "人事部 ダッシュボード"}
        </h1>
        <p className="text-muted-foreground">
          {profile?.role === "area_manager"
            ? `担当エリア: ${managedAreas.join(", ") || "未設定"}`
            : "全店舗のシフト・マッチング・出勤状況を管理"}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="rounded-lg border border-t-4 border-t-primary bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">全マッチング数</p>
            <p className="font-heading text-3xl font-bold tabular-nums">{totalMatchingCount}</p>
            <div className="flex items-end gap-1">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              <span className="h-3 w-2 rounded-full bg-primary/70" />
              <span className="h-4 w-2 rounded-full bg-primary/80" />
              <span className="h-5 w-2 rounded-full bg-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-t-4 border-t-yellow-500 bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">承認待ち</p>
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            </div>
            <p className="font-heading text-3xl font-bold tabular-nums">{pendingSummaryCount}</p>
            <p className="text-xs text-muted-foreground">シフト申請</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-t-4 border-t-green-500 bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">今月の充足率</p>
            <p className="font-heading text-3xl font-bold tabular-nums">{fillRate}%</p>
            <p className="text-xs text-muted-foreground">
              出勤中 {clockedInCount} / 完了 {completedCount} / 待機 {scheduledCount}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-t-4 border-t-blue-500 bg-card shadow-sm">
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">キャンセル率</p>
            <p className="font-heading text-3xl font-bold tabular-nums">{cancelRate}%</p>
            <p className="text-xs text-muted-foreground">
              前日未確認 {unconfirmedCount} / シフト希望 {filteredAvailabilities.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[160px_160px_160px_1fr_auto]">
            <select className="h-10 rounded-xl border border-input bg-white px-3 text-sm">
              <option>ステータス</option>
              <option>承認待ち</option>
              <option>承認済</option>
              <option>完了</option>
              <option>キャンセル</option>
            </select>
            <select className="h-10 rounded-xl border border-input bg-white px-3 text-sm">
              <option>エリア</option>
              {areaOptions.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
            <select className="h-10 rounded-xl border border-input bg-white px-3 text-sm">
              <option>期間</option>
              <option>今日</option>
              <option>明日</option>
              <option>今週</option>
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-10 rounded-xl pl-9" placeholder="検索" />
            </div>
            <Button className="h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base font-semibold">マッチング一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>トレーナー名</TableHead>
                  <TableHead>店舗名</TableHead>
                  <TableHead>シフト日</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>時給</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      表示できるデータがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={`hover:bg-muted/50 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                    >
                      <TableCell className="font-medium">{row.trainerName}</TableCell>
                      <TableCell>{row.storeName}</TableCell>
                      <TableCell>{row.shiftDate}</TableCell>
                      <TableCell>{row.time}</TableCell>
                      <TableCell>{row.rate}</TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(row.status)}`}
                        >
                          {getStatusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {row.canApprove && row.shiftId ? (
                            <>
                              <form>
                                <Button
                                  size="sm"
                                  className="h-8 rounded-xl bg-green-600 px-3 text-white hover:bg-green-700"
                                  formAction={async () => {
                                    "use server";
                                    await approveShiftRequest(row.shiftId);
                                    redirect("/hr");
                                  }}
                                >
                                  承認
                                </Button>
                              </form>
                              <form>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-xl px-3"
                                  formAction={async () => {
                                    "use server";
                                    await rejectShiftRequest(row.shiftId);
                                    redirect("/hr");
                                  }}
                                >
                                  却下
                                </Button>
                              </form>
                            </>
                          ) : null}
                          <Link href="/hr/matchings" className="text-sm text-primary hover:underline">
                            詳細
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              {totalMatchingCount === 0
                ? `0 / ${totalMatchingCount}件`
                : `1-${Math.min(10, totalMatchingCount)} / ${totalMatchingCount}件`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-xl px-2" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-xl px-3">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-xl px-2" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
