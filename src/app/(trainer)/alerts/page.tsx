import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateJP } from "@/lib/formatters";
import type { BlankRuleConfig, BlankStatus } from "@/types/database";

const blankStatusLabelMap: Record<BlankStatus, string> = {
  ok: "正常",
  alert_60: "60日アラート",
  skill_check_required: "スキルチェック必須",
  training_required: "再研修必須",
};

const blankStatusVariantMap: Record<
  BlankStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ok: "secondary",
  alert_60: "outline",
  skill_check_required: "default",
  training_required: "destructive",
};

function getDaysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  const start = new Date(`${dateString}T00:00:00`);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getActionMessage(status: BlankStatus): string {
  switch (status) {
    case "alert_60":
      return "近日中にシフトへ応募して稼働再開をお願いします。";
    case "skill_check_required":
      return "応募を再開するにはスキルチェックの完了が必要です。";
    case "training_required":
      return "応募を再開するには再研修の受講が必要です。";
    default:
      return "追加対応はありません。";
  }
}

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [trainerResult, rulesResult] = await Promise.all([
    supabase
      .from("alumni_trainers")
      .select("blank_status, last_shift_date")
      .eq("auth_user_id", user.id)
      .single(),
    supabase
      .from("blank_rule_config")
      .select("id, rule_type, threshold_days, action_required, description")
      .eq("is_active", true)
      .order("threshold_days"),
  ]);

  if (!trainerResult.data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold">ブランクアラート</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            ブランク情報を取得できませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const trainer = trainerResult.data;
  const rules = (rulesResult.data ?? []) as Pick<
    BlankRuleConfig,
    "id" | "rule_type" | "threshold_days" | "action_required" | "description"
  >[];
  const daysSinceLastShift = getDaysSince(trainer.last_shift_date);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">ブランクアラート</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          稼働状況と必要アクションを確認できます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">現在ステータス</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">状態</span>
            <Badge variant={blankStatusVariantMap[trainer.blank_status]}>
              {blankStatusLabelMap[trainer.blank_status]}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">最終稼働日</span>
            <span>{formatDateJP(trainer.last_shift_date)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">最終稼働からの日数</span>
            <span>{daysSinceLastShift === null ? "-" : `${daysSinceLastShift}日`}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ブランクルール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {rules.length === 0 ? (
            <p className="text-muted-foreground">有効なルールはありません。</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-md border p-3">
                <p className="font-medium">{rule.threshold_days}日経過時</p>
                <p className="mt-1 text-muted-foreground">{rule.action_required}</p>
                {rule.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{rule.description}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {trainer.blank_status !== "ok" ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">対応が必要です</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {getActionMessage(trainer.blank_status)}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
