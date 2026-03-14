import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Shield, Award, TrendingUp, ChevronRight, History, Banknote } from "lucide-react";

const rankConfig: Record<
  string,
  { label: string; color: string; icon: typeof Trophy; next: string | null; description: string }
> = {
  bronze: {
    label: "ブロンズ",
    color: "bg-amber-700 text-white",
    icon: Shield,
    next: "silver",
    description: "SPOT勤務を開始したばかりです。実績を積んでランクアップしましょう！",
  },
  silver: {
    label: "シルバー",
    color: "bg-gray-400 text-white",
    icon: Award,
    next: "gold",
    description: "安定した実績があります。さらに高評価を目指しましょう！",
  },
  gold: {
    label: "ゴールド",
    color: "bg-yellow-500 text-white",
    icon: Star,
    next: "platinum",
    description: "優秀なトレーナーです。プラチナランクまであと少し！",
  },
  platinum: {
    label: "プラチナ",
    color: "bg-gradient-to-r from-blue-400 to-purple-500 text-white",
    icon: Trophy,
    next: null,
    description: "最高ランクのトレーナーです。おめでとうございます！",
  },
};

const badgeLabels: Record<string, { label: string; icon: string }> = {
  first_shift: { label: "初シフト完了", icon: "🎯" },
  five_shifts: { label: "5回勤務達成", icon: "⭐" },
  ten_shifts: { label: "10回勤務達成", icon: "🌟" },
  high_rating: { label: "高評価トレーナー", icon: "👑" },
  multi_store: { label: "複数店舗勤務", icon: "🏪" },
  no_cancel: { label: "キャンセルゼロ", icon: "✨" },
  emergency_hero: { label: "緊急対応ヒーロー", icon: "🦸" },
  weekend_warrior: { label: "週末ウォリアー", icon: "💪" },
};

export default async function RankPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id, rank, badges, tenure_years")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) redirect("/home");

  // Calculate total_shifts and average_rating from related tables
  const { count: shiftCount } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", trainer.id)
    .in("status", ["verified", "clocked_out"]);

  const { data: evalData } = await supabase
    .from("evaluations")
    .select("rating")
    .eq("trainer_id", trainer.id);

  const totalShifts = shiftCount ?? 0;
  const avgRating = evalData && evalData.length > 0
    ? evalData.reduce((sum, e) => sum + (e.rating ?? 0), 0) / evalData.length
    : 0;

  const rank = (trainer.rank as string) ?? "bronze";
  const badges = (trainer.badges as string[]) ?? [];
  const config = rankConfig[rank] ?? rankConfig.bronze;
  const RankIcon = config.icon;

  // Rank thresholds (match DB cron job)
  const rankThresholds: Record<string, { shifts: number; rating: number }> = {
    bronze: { shifts: 0, rating: 0 },
    silver: { shifts: 10, rating: 3.5 },
    gold: { shifts: 30, rating: 4.0 },
    platinum: { shifts: 50, rating: 4.5 },
  };
  const nextRankKey = config.next;
  const nextThreshold = nextRankKey ? rankThresholds[nextRankKey] : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">ランク & バッジ</h1>

      {/* Current Rank */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className={`h-2 ${config.color}`} />
        <CardContent className="p-6 text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-muted/50 p-4">
            <RankIcon className="h-10 w-10 text-primary" />
          </div>
          <div>
            <Badge className={`${config.color} text-base px-4 py-1`}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{config.description}</p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">勤務回数</p>
              <p className="text-xl font-bold">{totalShifts}回</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">平均評価</p>
              <p className="text-xl font-bold">
                {avgRating > 0 ? avgRating.toFixed(1) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Rank Progress */}
      {nextThreshold && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              次のランクまで
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>勤務回数</span>
                <span className="font-medium">
                  {totalShifts} / {nextThreshold.shifts}回
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (totalShifts / nextThreshold.shifts) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>平均評価</span>
                <span className="font-medium">
                  {avgRating > 0 ? avgRating.toFixed(1) : "0"} / {nextThreshold.rating}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${Math.min(100, (avgRating / nextThreshold.rating) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            獲得バッジ
            <Badge variant="secondary" className="ml-auto">
              {badges.length}個
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              まだバッジを獲得していません。シフトに参加してバッジを集めましょう！
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => {
                const info = badgeLabels[badge] ?? {
                  label: badge,
                  icon: "🏅",
                };
                return (
                  <div
                    key={badge}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 p-3"
                  >
                    <span className="text-xl">{info.icon}</span>
                    <span className="text-sm font-medium">{info.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hourly Rate Table — "長く勤めるほど得" */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            在籍年数と時給テーブル
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Dr.stretchに長く在籍するほど、SPOTの基本時給が上がります
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            const tenureYears = trainer.tenure_years ?? 0;
            const rateTable = [
              { range: "2〜3年", rate: 1400, min: 2, max: 3 },
              { range: "3〜5年", rate: 1600, min: 3, max: 5 },
              { range: "5〜7年", rate: 1800, min: 5, max: 7 },
              { range: "7年以上", rate: 2000, min: 7, max: 99 },
            ];
            const currentTier = rateTable.find(
              (t) => tenureYears >= t.min && tenureYears < t.max
            );
            const currentIndex = currentTier ? rateTable.indexOf(currentTier) : -1;
            const nextTier = currentIndex >= 0 && currentIndex < rateTable.length - 1
              ? rateTable[currentIndex + 1]
              : null;

            return (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">在籍年数</th>
                        <th className="px-3 py-2 text-right font-medium">基本時給</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateTable.map((tier) => {
                        const isCurrent = tier === currentTier;
                        return (
                          <tr
                            key={tier.range}
                            className={isCurrent ? "bg-primary/5 font-semibold" : ""}
                          >
                            <td className="px-3 py-2.5">
                              {tier.range}
                              {isCurrent && (
                                <span className="ml-2 text-xs text-accent font-bold">
                                  ← あなた
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              ¥{tier.rate.toLocaleString()}/h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {nextTier && currentTier && (
                  <div className="rounded-lg bg-accent/10 border border-accent/20 p-4 space-y-2">
                    <p className="text-sm font-medium text-accent">
                      あと{nextTier.min - tenureYears > 0 ? `${(nextTier.min - tenureYears).toFixed(1)}年` : "わずか"}で +¥{(nextTier.rate - currentTier.rate).toLocaleString()}/h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      月8回勤務（8h）の場合、月間 +¥{((nextTier.rate - currentTier.rate) * 8 * 8).toLocaleString()} の収入増
                    </p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{
                          width: `${Math.min(100, ((tenureYears - currentTier.min) / (nextTier.min - currentTier.min)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {!nextTier && currentTier && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                    <p className="text-sm font-medium">
                      最高時給ランクです！あなたの{tenureYears}年の経験は大きな財産です。
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Evaluation History Link */}
      <Link href="/evaluation-history">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">評価履歴を見る</p>
                <p className="text-xs text-muted-foreground">
                  過去の評価詳細・カテゴリ別スコアを確認
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Rank Criteria Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            ランク昇格基準
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">ランク</th>
                  <th className="px-3 py-2 text-center font-medium">勤務回数</th>
                  <th className="px-3 py-2 text-center font-medium">平均評価</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rankThresholds).map(([key, threshold]) => {
                  const rc = rankConfig[key];
                  const isCurrent = key === rank;
                  return (
                    <tr
                      key={key}
                      className={isCurrent ? "bg-primary/5 font-medium" : ""}
                    >
                      <td className="px-3 py-2 flex items-center gap-2">
                        <Badge
                          className={`${rc?.color ?? ""} text-xs px-2 py-0.5`}
                        >
                          {rc?.label ?? key}
                        </Badge>
                        {isCurrent && (
                          <span className="text-xs text-primary">
                            (現在)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {threshold.shifts === 0 ? "-" : `${threshold.shifts}回以上`}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {threshold.rating === 0
                          ? "-"
                          : `${threshold.rating.toFixed(1)}以上`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* All Available Badges */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">全バッジ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(badgeLabels).map(([key, info]) => {
              const earned = badges.includes(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 rounded-lg p-3 ${
                    earned
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/30 opacity-50"
                  }`}
                >
                  <span className="text-xl">{earned ? info.icon : "🔒"}</span>
                  <span className="text-sm">{info.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
