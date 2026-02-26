import { createClient } from "@/lib/supabase/server";
import { SimulationForm } from "./SimulationForm";

export default async function HRSimulationPage() {
  const supabase = await createClient();

  const { data: rateConfigs } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("is_active", true)
    .order("tenure_min_years");

  const { count: trainerCount } = await supabase
    .from("alumni_trainers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">変更シミュレーション</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          時給変更がコストに与える影響を事前に試算します（現在のアクティブトレーナー: {trainerCount ?? 0}名）
        </p>
      </div>

      <SimulationForm currentConfigs={rateConfigs ?? []} />
    </div>
  );
}
