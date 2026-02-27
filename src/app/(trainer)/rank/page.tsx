import { createClient } from "@/lib/supabase/server";
import type { TrainerRank } from "@/types/database";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Award, Star, TrendingUp } from "lucide-react";

const RANK_ORDER: TrainerRank[] = ["bronze", "silver", "gold", "platinum"];

const RANK_CONFIG: Record<
  TrainerRank,
  {
    label: string;
    colorClass: string;
    minShifts: number;
    minRating: number;
    requirement: string;
  }
> = {
  bronze: {
    label: "Bronze",
    colorClass: "bg-amber-700 text-white",
    minShifts: 0,
    minRating: 0,
    requirement: "Default on registration",
  },
  silver: {
    label: "Silver",
    colorClass: "bg-gray-400 text-white",
    minShifts: 10,
    minRating: 3.5,
    requirement: "10+ completed shifts AND avg rating >= 3.5",
  },
  gold: {
    label: "Gold",
    colorClass: "bg-yellow-500 text-white",
    minShifts: 30,
    minRating: 4,
    requirement: "30+ completed shifts AND avg rating >= 4.0",
  },
  platinum: {
    label: "Platinum",
    colorClass: "bg-purple-600 text-white",
    minShifts: 50,
    minRating: 4.5,
    requirement: "50+ completed shifts AND avg rating >= 4.5",
  },
};

type TrainerRankRow = {
  id: string;
  rank: TrainerRank | null;
  badges: string[] | null;
  tenure_years: number | null;
};

type EvaluationRatingRow = {
  rating: number | null;
};

function getNextRank(rank: TrainerRank): TrainerRank | null {
  const index = RANK_ORDER.indexOf(rank);
  if (index === -1 || index === RANK_ORDER.length - 1) return null;
  return RANK_ORDER[index + 1];
}

function renderStars(rating: number, className: string) {
  return Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    const filled = starValue <= rating;
    return (
      <Star
        key={`${className}-${starValue}`}
        className={`${className} ${filled ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
      />
    );
  });
}

export default async function RankPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: trainerData } = await supabase
    .from("alumni_trainers")
    .select("id, rank, badges, tenure_years")
    .eq("auth_user_id", user.id)
    .single();

  const trainer = trainerData as TrainerRankRow | null;
  if (!trainer) redirect("/login");

  const [{ count }, { data: ratingRows }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", trainer.id)
      .in("status", ["clocked_out", "verified"]),
    supabase
      .from("evaluations")
      .select("rating")
      .eq("trainer_id", trainer.id),
  ]);

  const completedShiftCount = count ?? 0;
  const ratings = (ratingRows as EvaluationRatingRow[] | null) ?? [];
  const validRatings = ratings
    .map((row) => row.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const avgRating =
    validRatings.length > 0
      ? validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length
      : 0;

  const currentRank = trainer.rank ?? "bronze";
  const nextRank = getNextRank(currentRank);
  const nextRankRequirement = nextRank ? RANK_CONFIG[nextRank] : null;

  const shiftProgress = nextRankRequirement
    ? Math.min(1, completedShiftCount / nextRankRequirement.minShifts)
    : 1;
  const ratingProgress = nextRankRequirement
    ? Math.min(1, avgRating / nextRankRequirement.minRating)
    : 1;
  const overallProgress = Math.round(Math.min(shiftProgress, ratingProgress) * 100);

  const progressSegments = 10;
  const filledProgressSegments = Math.round(
    (overallProgress / 100) * progressSegments
  );

  const tenureYears = Math.max(0, trainer.tenure_years ?? 0);
  const tenureSegments = 10;
  const filledTenureSegments = Math.min(tenureSegments, Math.round(tenureYears));
  const badges = trainer.badges ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto animate-fade-in-up">
      <h1 className="font-heading text-2xl font-bold">ランク・バッジ</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl ${RANK_CONFIG[currentRank].colorClass}`}
            >
              <Award className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <Badge className={RANK_CONFIG[currentRank].colorClass}>
                {RANK_CONFIG[currentRank].label}
              </Badge>
              <p className="text-sm text-muted-foreground">現在のランク</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">完了シフト</p>
              <p className="text-2xl font-bold">{completedShiftCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">平均評価</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
                <div className="flex items-center gap-0.5">
                  {renderStars(Math.round(avgRating), "h-4 w-4")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">次ランクへの進捗</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextRankRequirement ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  次のランク:{" "}
                  <span className="font-semibold text-foreground">
                    {nextRankRequirement.label}
                  </span>
                </p>
                <Badge variant="outline">{overallProgress}%</Badge>
              </div>

              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: progressSegments }, (_, index) => (
                  <div
                    key={`progress-${index}`}
                    className={`h-2 rounded-full ${index < filledProgressSegments ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  シフト: {completedShiftCount}/{nextRankRequirement.minShifts}
                </div>
                <div>
                  評価: {avgRating.toFixed(1)}/{nextRankRequirement.minRating.toFixed(1)}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              最高ランクです。これからも継続してご活躍ください。
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">在籍年数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold">
              {tenureYears}
              <span className="ml-1 text-base font-medium">年</span>
            </p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">キャリア</span>
            </div>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: tenureSegments }, (_, index) => (
              <div
                key={`tenure-${index}`}
                className={`h-2 rounded-full ${index < filledTenureSegments ? "bg-accent" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">10年を上限に表示しています</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">獲得バッジ</CardTitle>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">獲得済みバッジはありません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <Badge key={`${badge}-${index}`} variant="secondary">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">ランク条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {RANK_ORDER.map((rank, index) => (
            <div key={rank} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Badge className={RANK_CONFIG[rank].colorClass}>
                    {RANK_CONFIG[rank].label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {RANK_CONFIG[rank].requirement}
                  </p>
                </div>
              </div>
              {index < RANK_ORDER.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
