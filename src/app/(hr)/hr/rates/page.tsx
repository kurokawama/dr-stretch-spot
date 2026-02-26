import { createClient } from "@/lib/supabase/server";
import { RateConfigTable } from "./RateConfigTable";
import { BlankRuleTable } from "./BlankRuleTable";
import { Separator } from "@/components/ui/separator";

export default async function HRRatesPage() {
  const supabase = await createClient();

  const { data: rateConfigs } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("is_active", true)
    .order("tenure_min_years");

  const { data: blankRules } = await supabase
    .from("blank_rule_config")
    .select("*")
    .eq("is_active", true)
    .order("threshold_days");

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">時給テーブル管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          在籍年数に基づく基本時給と出勤ボーナスの設定
        </p>
      </div>

      <RateConfigTable initialData={rateConfigs ?? []} />

      <Separator />

      <div>
        <h2 className="font-heading text-xl font-bold">ブランクルール設定</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          未稼働期間に応じたアクション閾値の設定
        </p>
      </div>

      <BlankRuleTable initialData={blankRules ?? []} />
    </div>
  );
}
