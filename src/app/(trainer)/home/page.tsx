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
  TrendingUp,
  Trophy,
  Star as StarIcon,
  Bell,
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
      <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">ようこそ</p>
          <h1 className="font-heading text-2xl font-bold">
            {displayName}<span className="font-normal text-lg">さん</span>
          </h1>
        </div>

        {!resignation ? (
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-heading text-lg font-semibold">退職のご連絡</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    退職をお考えですか？アプリから簡単に退職意向の登録ができます。
                  </p>
                </div>
              </div>
              <Button asChild className="w-full h-11 font-medium" size="lg">
                <Link href="/resignation">
                  手続きを始める
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : resignation.status === "submitted" ? (
          <div className="space-y-4 stagger-children">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-lg font-semibold">お手続き状況</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 p-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">退職意向　提出済み</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {resignation.submitted_at
                        ? new Date(resignation.submitted_at).toLocaleDateString("ja-JP")
                        : ""}
                    </span>
                  </div>
                  <div className="ml-3 border-l-2 border-dashed border-amber-300 h-4" />
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-100 p-1">
                      <Clock3 className="h-4 w-4 text-amber-600 animate-pulse" />
                    </div>
                    <span className="text-sm text-muted-foreground">人事部受理　確認中...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md bg-gradient-to-br from-[oklch(0.97_0.03_110)] to-white">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-[oklch(0.55_0.18_110)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">退職後も Dr.stretch で活躍しませんか？</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      先月 23名 のOBトレーナーがSPOTで活躍しています。
                      好きな時間に好きな店舗で、あなたの経験を活かせます。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : resignation.status === "received" ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading text-lg font-semibold">お手続き状況</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">退職意向　提出済み</span>
                </div>
                <div className="ml-3 border-l-2 border-green-300 h-4" />
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">人事部受理　受理済み</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {resignation.received_at
                      ? new Date(resignation.received_at).toLocaleDateString("ja-JP")
                      : ""}
                  </span>
                </div>
                <div className="ml-3 border-l-2 border-dashed border-amber-300 h-4" />
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-100 p-1">
                    <Clock3 className="h-4 w-4 text-amber-600 animate-pulse" />
                  </div>
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
      <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">お疲れ様でした</p>
          <h1 className="font-heading text-2xl font-bold">
            {displayName}<span className="font-normal text-lg">さん</span>
          </h1>
        </div>

        {resignation?.status === "completed" && (
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-green-500 to-green-400" />
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <h2 className="font-heading font-semibold text-green-800">
                  退職手続きが完了しました
                </h2>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5 ml-9">
                <p>退職者ID: <span className="font-mono text-foreground">{trainer?.id?.slice(0, 8).toUpperCase()}</span></p>
                {trainer?.employment_start_date && trainer?.employment_end_date && (
                  <p>在籍: {trainer.employment_start_date} 〜 {trainer.employment_end_date}</p>
                )}
                {trainer?.tenure_years != null && <p>在籍年数: <span className="font-semibold text-foreground">{trainer.tenure_years}年</span></p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-[oklch(0.65_0.25_20)]" />
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">SPOTワークを始める</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  あなたの経験を活かして、好きな時間に好きな店舗で働けます。
                </p>
              </div>
            </div>
            <div className="space-y-2.5 ml-1">
              {[
                "希望エリア・時間帯を設定するだけ",
                "氏名等は入力済みです",
                "約3分で完了",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2.5">
                  <div className="rounded-full bg-green-100 p-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
            <Button asChild className="w-full h-12 font-medium text-base" size="lg">
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
  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
    completed: "bg-blue-100 text-blue-800 border-blue-200",
    no_show: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-lg mx-auto">
      {/* Greeting section */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">おかえりなさい</p>
          <h1 className="font-heading text-2xl font-bold">
            {trainer?.full_name ?? "トレーナー"}<span className="font-normal text-lg">さん</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-semibold text-primary">{trainer?.tenure_years ?? 0}年</span>
        </div>
      </div>

      {/* Blank alert */}
      {trainer?.blank_status && trainer.blank_status !== "ok" && (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-destructive" />
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-destructive">ブランクアラート</p>
              <p className="text-xs text-muted-foreground">
                {trainer.blank_status === "alert_60" && "60日以上シフトに入っていません"}
                {trainer.blank_status === "skill_check_required" && "スキルチェックが必要です"}
                {trainer.blank_status === "training_required" && "再研修が必要です"}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href="/alerts">詳細</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-3 grid-cols-2">
        <Link href="/shifts" className="card-interactive">
          <Card className="border-0 shadow-sm h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-20">
              <div className="rounded-lg bg-primary/10 p-2">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">シフト検索</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/my-shifts" className="card-interactive">
          <Card className="border-0 shadow-sm h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-20">
              <div className="rounded-lg bg-blue-50 p-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium">マイシフト</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/rank" className="card-interactive">
          <Card className="border-0 shadow-sm h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-20">
              <div className="rounded-lg bg-yellow-50 p-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
              </div>
              <span className="text-sm font-medium">ランク</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/notifications" className="card-interactive">
          <Card className="border-0 shadow-sm h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-20">
              <div className="rounded-lg bg-red-50 p-2">
                <Bell className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm font-medium">通知</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's shifts */}
      {todayShifts && todayShifts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              本日のシフト
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 stagger-children">
            {todayShifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <div>
                  <p className="font-medium text-sm">{(shift.store as unknown as { name: string })?.name}</p>
                  <p className="text-xs text-muted-foreground">{shift.scheduled_start} - {shift.scheduled_end}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    shift.status === "clocked_in"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : shift.status === "clocked_out"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                  }
                >
                  {shift.status === "scheduled" ? "予定" : shift.status === "clocked_in" ? "出勤中" : "退勤済"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent applications */}
      {recentApps && recentApps.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">最近の応募</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 stagger-children">
            {recentApps.map((app) => {
              const sr = app.shift_request as unknown as { title: string; shift_date: string; store: { name: string } } | null;
              return (
                <div key={app.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <div>
                    <p className="font-medium text-sm">{sr?.title ?? "シフト"}</p>
                    <p className="text-xs text-muted-foreground">{sr?.store?.name} / {sr?.shift_date}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline" className={statusColors[app.status] ?? ""}>
                      {statusLabels[app.status] ?? app.status}
                    </Badge>
                    <p className="text-xs font-mono text-muted-foreground">¥{app.confirmed_rate}/h</p>
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
