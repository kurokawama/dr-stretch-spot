import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  CalendarDays,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock3,
  ArrowRight,
} from "lucide-react";

export default async function TrainerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isEmployee = profile?.role === "employee";

  // Get resignation status
  const { data: resignation } = await supabase
    .from("resignation_requests")
    .select("id, status, full_name, desired_resignation_date, submitted_at, received_at, completed_at")
    .eq("auth_user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get trainer data
  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id, full_name, blank_status, last_shift_date, tenure_years, spot_status, employment_start_date, employment_end_date")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const displayName = trainer?.full_name ?? resignation?.full_name ?? "ユーザー";
  const spotStatus = trainer?.spot_status ?? null;

  // =============================================
  // Employee Mode
  // =============================================
  if (isEmployee) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="font-heading text-2xl font-bold">
          こんにちは、{displayName}さん
        </h1>

        {!resignation ? (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="font-heading text-lg font-semibold">退職のご連絡</h2>
                  <p className="text-sm text-muted-foreground">
                    退職をお考えですか？アプリから簡単に退職意向の登録ができます。
                  </p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/resignation">
                  手続きを始める
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : resignation.status === "submitted" ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="font-heading text-lg font-semibold">お手続き状況</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm">退職意向　提出済み</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {resignation.submitted_at
                        ? new Date(resignation.submitted_at).toLocaleDateString("ja-JP")
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-amber-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">人事部受理　確認中...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[oklch(0.87_0.18_110)]/30 bg-[oklch(0.87_0.18_110)]/5">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-[oklch(0.65_0.18_110)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">退職後も Dr.stretch で活躍しませんか？</h3>
                    <p className="text-xs text-muted-foreground">
                      先月 23名 のOBトレーナーがSPOTで活躍しています。
                      好きな時間に好きな店舗で、あなたの経験を活かせます。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : resignation.status === "received" ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="font-heading text-lg font-semibold">お手続き状況</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">退職意向　提出済み</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">人事部受理　受理済み</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {resignation.received_at
                      ? new Date(resignation.received_at).toLocaleDateString("ja-JP")
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-amber-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">退職処理中...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  // =============================================
  // Trainer: SPOT not active
  // =============================================
  if (spotStatus && spotStatus !== "active") {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="font-heading text-2xl font-bold">
          お疲れ様でした、{displayName}さん
        </h1>

        {resignation?.status === "completed" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h2 className="font-heading text-lg font-semibold text-green-800">
                  退職手続きが完了しました
                </h2>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>退職者ID: {trainer?.id?.slice(0, 8).toUpperCase()}</p>
                {trainer?.employment_start_date && trainer?.employment_end_date && (
                  <p>在籍: {trainer.employment_start_date} 〜 {trainer.employment_end_date}</p>
                )}
                {trainer?.tenure_years != null && <p>在籍年数: {trainer.tenure_years}年</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">SPOTワークを始める</h2>
                <p className="text-sm text-muted-foreground">
                  あなたの経験を活かして、好きな時間に好きな店舗で働けます。
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    希望エリア・時間帯を設定するだけ
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    氏名等は入力済みです
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    約3分で完了
                  </li>
                </ul>
              </div>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/spot-setup">
                3分で設定する
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              今は興味がない方も、いつでもプロフィールから変更できます
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =============================================
  // Trainer: SPOT Active — Full dashboard
  // =============================================
  const today = new Date().toISOString().split("T")[0];
  const trainerId = trainer?.id ?? "";

  const { data: todayShifts } = await supabase
    .from("attendance_records")
    .select("*, store:stores(name)")
    .eq("trainer_id", trainerId)
    .eq("shift_date", today)
    .order("scheduled_start");

  const { data: recentApps } = await supabase
    .from("shift_applications")
    .select("id, status, confirmed_rate, applied_at, shift_request:shift_requests(title, shift_date, store:stores(name))")
    .eq("trainer_id", trainerId)
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
        <p className="text-sm text-muted-foreground">在籍年数: {trainer?.tenure_years ?? 0}年</p>
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
          <Link href="/shifts"><Search className="h-5 w-5" /><span className="text-sm">シフト検索</span></Link>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-1" asChild>
          <Link href="/my-shifts"><CalendarDays className="h-5 w-5" /><span className="text-sm">マイシフト</span></Link>
        </Button>
      </div>

      {todayShifts && todayShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-4 w-4" />本日のシフト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayShifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-sm">{(shift.store as unknown as { name: string })?.name}</p>
                  <p className="text-xs text-muted-foreground">{shift.scheduled_start} - {shift.scheduled_end}</p>
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
          <CardHeader className="pb-3"><CardTitle className="text-lg">最近の応募</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentApps.map((app) => {
              const sr = app.shift_request as unknown as { title: string; shift_date: string; store: { name: string } } | null;
              return (
                <div key={app.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium text-sm">{sr?.title ?? "シフト"}</p>
                    <p className="text-xs text-muted-foreground">{sr?.store?.name} / {sr?.shift_date}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariants[app.status] ?? "outline"}>{statusLabels[app.status] ?? app.status}</Badge>
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
