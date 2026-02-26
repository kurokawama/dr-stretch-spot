import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, CalendarDays, Clock, AlertTriangle } from "lucide-react";

export default async function TrainerHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("full_name, blank_status, last_shift_date, tenure_years")
    .eq("auth_user_id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];

  const { data: todayShifts } = await supabase
    .from("attendance_records")
    .select("*, store:stores(name)")
    .eq("trainer_id", (await supabase.from("alumni_trainers").select("id").eq("auth_user_id", user.id).single()).data?.id ?? "")
    .eq("shift_date", today)
    .order("scheduled_start");

  const { data: recentApps } = await supabase
    .from("shift_applications")
    .select("id, status, confirmed_rate, applied_at, shift_request:shift_requests(title, shift_date, store:stores(name))")
    .eq("trainer_id", (await supabase.from("alumni_trainers").select("id").eq("auth_user_id", user.id).single()).data?.id ?? "")
    .order("applied_at", { ascending: false })
    .limit(5);

  const statusLabels: Record<string, string> = {
    pending: "審査中", approved: "承認済", rejected: "不承認",
    cancelled: "キャンセル", completed: "完了", no_show: "欠勤",
  };
  const statusVariants: Record<string, "outline" | "default" | "destructive" | "secondary"> = {
    pending: "outline", approved: "default", rejected: "destructive",
    cancelled: "secondary", completed: "secondary", no_show: "destructive",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          おかえりなさい、{trainer?.full_name ?? "トレーナー"}さん
        </h1>
        <p className="text-sm text-muted-foreground">
          在籍年数: {trainer?.tenure_years ?? 0}年
        </p>
      </div>

      {trainer?.blank_status && trainer.blank_status !== "ok" && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">ブランクアラート</p>
              <p className="text-sm text-muted-foreground">
                {trainer.blank_status === "alert_60" && "60日以上シフトに入っていません"}
                {trainer.blank_status === "skill_check_required" && "スキルチェックが必要です"}
                {trainer.blank_status === "training_required" && "再研修が必要です"}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="ml-auto shrink-0">
              <Link href="/alerts">詳細</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2">
        <Button variant="outline" className="h-20 flex-col gap-1" asChild>
          <Link href="/shifts">
            <Search className="h-5 w-5" />
            <span className="text-sm">シフト検索</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-1" asChild>
          <Link href="/my-shifts">
            <CalendarDays className="h-5 w-5" />
            <span className="text-sm">マイシフト</span>
          </Link>
        </Button>
      </div>

      {todayShifts && todayShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              本日のシフト
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayShifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">{(shift.store as unknown as { name: string })?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.scheduled_start} - {shift.scheduled_end}
                  </p>
                </div>
                <Badge variant={shift.status === "clocked_in" ? "default" : "outline"}>
                  {shift.status === "scheduled" ? "予定" : shift.status === "clocked_in" ? "出勤中" : "退勤済"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recentApps && recentApps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">最近の応募</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentApps.map((app) => {
              const sr = app.shift_request as unknown as { title: string; shift_date: string; store: { name: string } } | null;
              return (
                <div key={app.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium text-sm">{sr?.title ?? "シフト"}</p>
                    <p className="text-xs text-muted-foreground">
                      {sr?.store?.name} / {sr?.shift_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariants[app.status] ?? "outline"}>
                      {statusLabels[app.status] ?? app.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">¥{app.confirmed_rate}/h</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
