import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, BarChart3 } from "lucide-react";
import { getTrainerEvaluations } from "@/actions/evaluations";

const categoryLabels: Record<string, string> = {
  technique: "技術力",
  communication: "コミュニケーション",
  punctuality: "時間厳守",
  attitude: "接客態度",
  teamwork: "チームワーク",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default async function EvaluationHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id, average_rating, total_shifts")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) redirect("/home");

  const result = await getTrainerEvaluations(trainer.id);
  const evaluations = result.success ? (result.data ?? []) : [];

  // Calculate category averages
  const categoryTotals: Record<string, { sum: number; count: number }> = {};
  evaluations.forEach((ev) => {
    if (ev.categories) {
      Object.entries(ev.categories).forEach(([key, val]) => {
        if (!categoryTotals[key]) categoryTotals[key] = { sum: 0, count: 0 };
        categoryTotals[key].sum += val as number;
        categoryTotals[key].count += 1;
      });
    }
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">評価履歴</h1>

      {/* Summary */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-orange-500" />
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">総合評価</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">
                  {trainer.average_rating
                    ? trainer.average_rating.toFixed(1)
                    : "-"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">評価件数</p>
              <p className="text-2xl font-bold mt-1">{evaluations.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">勤務回数</p>
              <p className="text-2xl font-bold mt-1">
                {trainer.total_shifts ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Averages */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              カテゴリ別平均
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(categoryTotals).map(([key, data]) => {
              const avg = data.sum / data.count;
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">
                    {categoryLabels[key] ?? key}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400"
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Evaluation History List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            評価履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              まだ評価がありません。シフト勤務後に店舗マネージャーから評価されます。
            </p>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg bg-muted/50 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <StarRating rating={ev.rating} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  {ev.categories && Object.keys(ev.categories).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(ev.categories).map(([key, val]) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-xs"
                        >
                          {categoryLabels[key] ?? key}: {val as number}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {ev.comment && (
                    <p className="text-sm text-muted-foreground">
                      {ev.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
