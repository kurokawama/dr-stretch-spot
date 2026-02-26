import Link from "next/link";
import { getTodayAttendance } from "@/actions/attendance";
import { getMyApplications } from "@/actions/applications";
import { createClient } from "@/lib/supabase/server";
import { formatDateJP, formatShiftDateTimeRangeJP } from "@/lib/formatters";
import { ApplicationStatusBadge } from "@/components/shared/ApplicationStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const attendanceStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "outline",
  clocked_in: "default",
  clocked_out: "secondary",
  verified: "secondary",
  disputed: "destructive",
};

const attendanceStatusLabel: Record<string, string> = {
  scheduled: "予定",
  clocked_in: "出勤中",
  clocked_out: "退勤済み",
  verified: "確定",
  disputed: "要確認",
};

export default async function TrainerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
    : { data: null };

  const [todayAttendanceResult, applicationsResult] = await Promise.all([
    getTodayAttendance(),
    getMyApplications(),
  ]);

  const todayAttendance = todayAttendanceResult.success
    ? (todayAttendanceResult.data ?? [])
    : [];
  const recentApplications = applicationsResult.success
    ? (applicationsResult.data ?? []).slice(0, 5)
    : [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">ホーム</h1>
        <p className="mt-2 text-muted-foreground">
          トレーナーダッシュボード（実装予定）
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile?.display_name
            ? `${profile.display_name}さん、本日もよろしくお願いします。`
            : "本日もよろしくお願いします。"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="w-full">
          <Link href="/shifts">シフトを探す</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/my-shifts">マイシフトを見る</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本日のシフト予定</CardTitle>
          <CardDescription>本日の打刻対象シフト</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              本日の予定はありません。
            </p>
          ) : (
            todayAttendance.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{record.store?.name ?? "店舗未設定"}</p>
                  <Badge variant={attendanceStatusVariant[record.status] ?? "outline"}>
                    {attendanceStatusLabel[record.status] ?? record.status}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {formatShiftDateTimeRangeJP(
                    record.shift_date,
                    record.scheduled_start,
                    record.scheduled_end
                  )}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近の応募ステータス</CardTitle>
          <CardDescription>最新の応募を5件表示</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              表示できる応募履歴がありません。
            </p>
          ) : (
            recentApplications.map((application) => (
              <div key={application.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {application.shift_request?.store?.name ?? "店舗未設定"}
                  </p>
                  <ApplicationStatusBadge status={application.status} />
                </div>
                <p className="mt-1 text-muted-foreground">
                  {formatDateJP(application.shift_request?.shift_date ?? null)}{" "}
                  {application.shift_request?.start_time?.slice(0, 5)}-
                  {application.shift_request?.end_time?.slice(0, 5)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
