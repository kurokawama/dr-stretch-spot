import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, BookOpen } from "lucide-react";

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("blank_status, last_shift_date")
    .eq("auth_user_id", user.id)
    .single();

  const { data: blankRules } = await supabase
    .from("blank_rule_config")
    .select("*")
    .eq("is_active", true)
    .order("threshold_days");

  // Calculate days since last shift
  let daysSinceLastShift: number | null = null;
  if (trainer?.last_shift_date) {
    const lastDate = new Date(trainer.last_shift_date);
    const now = new Date();
    daysSinceLastShift = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle; description: string }> = {
    ok: {
      label: "正常",
      color: "text-green-600",
      icon: CheckCircle,
      description: "ブランクの問題はありません。引き続きシフトに入りましょう！",
    },
    alert_60: {
      label: "予防アラート",
      color: "text-amber-600",
      icon: Clock,
      description: "60日以上シフトに入っていません。早めにシフトに応募しましょう。",
    },
    skill_check_required: {
      label: "スキルチェック必要",
      color: "text-red-600",
      icon: AlertTriangle,
      description: "90日以上のブランクのため、スキルチェックの合格が必要です。最寄りの店舗にお問い合わせください。",
    },
    training_required: {
      label: "再研修必要",
      color: "text-red-700",
      icon: BookOpen,
      description: "120日以上のブランクのため、再研修の受講が必要です。人事部にお問い合わせください。",
    },
  };

  const status = trainer?.blank_status ?? "ok";
  const config = statusConfig[status] ?? statusConfig.ok;
  const StatusIcon = config.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">ブランクアラート</h1>

      <Card className={status !== "ok" ? "border-destructive/50" : "border-green-200"}>
        <CardContent className="flex items-start gap-4 p-6">
          <StatusIcon className={`h-8 w-8 shrink-0 ${config.color}`} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold">{config.label}</h2>
              <Badge variant={status === "ok" ? "secondary" : "destructive"}>
                {status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            {daysSinceLastShift !== null && (
              <p className="mt-2 text-sm">
                最終勤務日からの経過日数: <span className="font-bold">{daysSinceLastShift}日</span>
              </p>
            )}
            {!trainer?.last_shift_date && (
              <p className="mt-2 text-sm text-muted-foreground">
                ※ まだシフト勤務履歴がありません
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ブランクルール</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {blankRules?.map((rule) => {
              const isActive = daysSinceLastShift !== null && daysSinceLastShift >= rule.threshold_days;
              return (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 rounded-md border p-3 ${isActive ? "border-destructive/50 bg-destructive/5" : ""}`}
                >
                  <div className={`h-3 w-3 rounded-full shrink-0 ${isActive ? "bg-destructive" : "bg-muted"}`} />
                  <div>
                    <p className="text-sm font-medium">
                      {rule.threshold_days}日以上 → {rule.action_required}
                    </p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
