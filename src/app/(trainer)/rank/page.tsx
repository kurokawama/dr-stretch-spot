import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Shield, Award, TrendingUp } from "lucide-react";

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
    .select("id, rank, badges, total_shifts, average_rating")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) redirect("/home");

  const rank = (trainer.rank as string) ?? "bronze";
  const badges = (trainer.badges as string[]) ?? [];
  const config = rankConfig[rank] ?? rankConfig.bronze;
  const RankIcon = config.icon;

  // Calculate progress to next rank
  const totalShifts = trainer.total_shifts ?? 0;
  const avgRating = trainer.average_rating ?? 0;
  const rankThresholds: Record<string, { shifts: number; rating: number }> = {
    bronze: { shifts: 0, rating: 0 },
    silver: { shifts: 5, rating: 3.0 },
    gold: { shifts: 15, rating: 3.5 },
    platinum: { shifts: 30, rating: 4.0 },
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
