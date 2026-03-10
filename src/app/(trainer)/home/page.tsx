import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  AlertTriangle,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock3,
  ArrowRight,
  TrendingUp,
  Trophy,
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
      <div className="animate-fade-in-up p-4 md:p-6 space-y-6 max-w-lg mx-auto">
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
      <div className="animate-fade-in-up p-4 md:p-6 space-y-6 max-w-lg mx-auto">
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

  const { data: availableShifts } = await supabase
    .from("shift_requests")
    .select("id, title, shift_date, start_time, end_time, emergency_bonus_amount, is_emergency, store:stores(name, area)")
    .eq("status", "open")
    .gte("shift_date", today)
    .order("shift_date")
    .limit(4);

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

  const todayShift = todayShifts?.[0] ?? null;
  const nextShift = (availableShifts?.[0] ??
    todayShift) as
    | {
      shift_date?: string;
      start_time?: string;
      end_time?: string;
      scheduled_start?: string;
      scheduled_end?: string;
      store?: { name?: string } | null;
    }
    | null;
  const monthlyIncome = (recentApps ?? []).reduce((sum, app) => sum + (app.confirmed_rate ?? 0), 0);
  const rankLabel = (trainer?.tenure_years ?? 0) >= 5
    ? "ゴールド"
    : (trainer?.tenure_years ?? 0) >= 3
      ? "シルバー"
      : "ブロンズ";

  return (
    <div className="animate-fade-in-up mx-auto max-w-lg space-y-6 bg-background p-4 pb-24 md:p-6">
      <section className="rounded-2xl bg-gradient-to-b from-white to-red-50/30 p-4">
        <div className="space-y-4">
          <h1 className="font-heading text-xl font-bold text-foreground">
            おかえりなさい、{trainer?.full_name ?? "トレーナー"}さん 👋
          </h1>

          <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
            <p className="text-xs font-medium text-white/90">本日のシフト</p>
            <p className="mt-1 text-base font-semibold">
              {(todayShift?.store as unknown as { name: string } | null)?.name ?? "本日のシフト"}
            </p>
            <p className="mt-1 text-sm text-white/90">
              {todayShift ? `${todayShift.scheduled_start} - ${todayShift.scheduled_end}` : "--:-- - --:--"}
            </p>
            <Button asChild className="mt-4 h-9 rounded-xl bg-white px-4 text-sm font-semibold text-primary hover:bg-white/90">
              <Link href="/clock">打刻する</Link>
            </Button>
          </div>
        </div>
      </section>

      {trainer?.blank_status && trainer.blank_status !== "ok" && (
        <Card className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="h-1 bg-destructive" />
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">ブランクアラート</p>
              <p className="text-xs text-muted-foreground">
                {trainer.blank_status === "alert_60" && "60日以上シフトに入っていません"}
                {trainer.blank_status === "skill_check_required" && "スキルチェックが必要です"}
                {trainer.blank_status === "training_required" && "再研修が必要です"}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 rounded-xl">
              <Link href="/alerts">詳細</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Card className="rounded-lg border border-l-4 border-l-primary bg-card shadow-sm">
          <CardContent className="space-y-1 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">次のシフト</p>
            </div>
            <p className="line-clamp-1 text-xs font-semibold text-foreground">
              {nextShift?.shift_date ?? "未定"}
            </p>
            <p className="line-clamp-1 text-[11px] text-muted-foreground">
              {(nextShift?.store as { name?: string } | null)?.name ?? ""}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-l-4 border-l-[oklch(0.87_0.18_110)] bg-card shadow-sm">
          <CardContent className="space-y-1 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">今月の収入</p>
            </div>
            <p className="line-clamp-1 text-xs font-semibold text-foreground">
              ¥{monthlyIncome.toLocaleString("ja-JP")}
            </p>
            <p className="text-[11px] text-muted-foreground">直近5件</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-l-4 border-l-yellow-500 bg-card shadow-sm">
          <CardContent className="space-y-1 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">ランク</p>
            </div>
            <p className="line-clamp-1 text-xs font-semibold text-foreground">{rankLabel}</p>
            <p className="text-[11px] text-muted-foreground">{trainer?.tenure_years ?? 0}年</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">募集中のシフト</h2>
          <Link href="/shifts" className="text-xs font-medium text-primary">
            すべて見る &gt;
          </Link>
        </div>

        {availableShifts && availableShifts.length > 0 ? (
          <div className="space-y-3 stagger-children">
            {availableShifts.map((shift) => {
              const store = shift.store as unknown as { name?: string; area?: string } | null;
              return (
                <Card key={shift.id} className="rounded-lg border bg-card shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {store?.name ?? shift.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {shift.shift_date} {shift.start_time}〜{shift.end_time}
                        </p>
                      </div>
                      <Badge className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted">
                        {store?.area ?? "エリア"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-primary">
                        +¥{shift.emergency_bonus_amount.toLocaleString("ja-JP")}
                      </p>
                      <Button asChild size="sm" className="h-8 rounded-xl bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                        <Link href={`/shifts/${shift.id}`}>応募</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-lg border bg-card shadow-sm">
            <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
              募集中のシフト
            </CardContent>
          </Card>
        )}

        {recentApps && recentApps.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-heading text-sm font-semibold">最近の応募</h3>
            <div className="space-y-2">
              {recentApps.slice(0, 3).map((app) => {
                const sr = app.shift_request as unknown as { title: string; shift_date: string; store: { name: string } } | null;
                return (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{sr?.title ?? "シフト"}</p>
                      <p className="text-xs text-muted-foreground">{sr?.store?.name} / {sr?.shift_date}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[app.status] ?? ""}>
                      {statusLabels[app.status] ?? app.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
