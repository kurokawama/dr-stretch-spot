import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, ClipboardCheck, DollarSign, Users } from "lucide-react";
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
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

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPending.length}</div>
            <p className="text-xs text-muted-foreground">シフト申請</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本日の出勤</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clockedInCount}/{filteredAttendance.length}
            </div>
            <p className="text-xs text-muted-foreground">
              出勤中 / 全体（待機: {scheduledCount}, 完了: {completedCount}）
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">明日の予定</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTomorrow.length}</div>
            <p className="text-xs text-muted-foreground">
              出勤予定
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">前日未確認</CardTitle>
            <AlertCircle
              className={`h-4 w-4 ${unconfirmedCount > 0 ? "text-red-500" : "text-green-500"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unconfirmedCount}</div>
            <p className="text-xs text-muted-foreground">
              {unconfirmedCount > 0 ? "要確認フォローアップ" : "全員確認済み"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      {filteredPending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              承認待ちシフト申請
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店舗</TableHead>
                  <TableHead>エリア</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>人数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">
                      {shift.store?.name}
                    </TableCell>
                    <TableCell>{shift.store?.area}</TableCell>
                    <TableCell>
                      {shift.title}
                      {shift.is_emergency && (
                        <Badge variant="destructive" className="ml-2">
                          緊急
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{shift.shift_date}</TableCell>
                    <TableCell>
                      {shift.start_time?.slice(0, 5)}〜
                      {shift.end_time?.slice(0, 5)}
                    </TableCell>
                    <TableCell>{shift.required_count}名</TableCell>
                    <TableCell>
                      <form className="flex gap-2">
                        <input type="hidden" name="shiftId" value={shift.id} />
                        <Button
                          size="sm"
                          formAction={async () => {
                            "use server";
                            await approveShiftRequest(shift.id);
                            redirect("/hr");
                          }}
                        >
                          承認
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          formAction={async () => {
                            "use server";
                            await rejectShiftRequest(shift.id);
                            redirect("/hr");
                          }}
                        >
                          却下
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tomorrow's attendance - unconfirmed alert */}
      {unconfirmedCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              明日の出勤 — 前日確認未回答（{unconfirmedCount}名）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>トレーナー</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>店舗</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>確認状況</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTomorrow
                  .filter((a) => !a.application?.pre_day_confirmed)
                  .map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.trainer?.full_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.trainer?.email}
                      </TableCell>
                      <TableCell>{record.store?.name}</TableCell>
                      <TableCell>
                        {record.scheduled_start?.slice(0, 5)}〜
                        {record.scheduled_end?.slice(0, 5)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">未確認</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Today's attendance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>本日の出勤状況</CardTitle>
          <Link href="/hr/attendance">
            <Button variant="outline" size="sm">
              詳細を見る
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {filteredAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              本日の出勤予定はありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>トレーナー</TableHead>
                  <TableHead>店舗</TableHead>
                  <TableHead>予定時間</TableHead>
                  <TableHead>出勤</TableHead>
                  <TableHead>退勤</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.trainer?.full_name}
                    </TableCell>
                    <TableCell>{record.store?.name}</TableCell>
                    <TableCell>
                      {record.scheduled_start?.slice(0, 5)}〜
                      {record.scheduled_end?.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      {record.clock_in_at
                        ? new Date(record.clock_in_at).toLocaleTimeString(
                            "ja-JP",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {record.clock_out_at
                        ? new Date(record.clock_out_at).toLocaleTimeString(
                            "ja-JP",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "clocked_in"
                            ? "default"
                            : record.status === "scheduled"
                              ? "secondary"
                              : record.status === "clocked_out"
                                ? "outline"
                                : "default"
                        }
                      >
                        {record.status === "scheduled"
                          ? "待機中"
                          : record.status === "clocked_in"
                            ? "出勤中"
                            : record.status === "clocked_out"
                              ? "退勤済"
                              : record.status === "verified"
                                ? "確認済"
                                : record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/hr/matchings">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                マッチング管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                マッチングの確認・キャンセル・人員追加
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hr/attendance">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4" />
                出勤一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                全店舗の出退勤記録を確認
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hr/rates">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                時給テーブル
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                時給設定・ブランクルール管理
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
