import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";

type StoreJoin = { name: string } | { name: string }[] | null;

type EvaluationHistoryRow = {
  id: string;
  created_at: string;
  rating: number | null;
  comment: string | null;
  categories: Record<string, unknown> | null;
  store: StoreJoin;
};

type TrainerRow = {
  id: string;
};

function resolveStoreName(store: StoreJoin) {
  if (!store) return "店舗";
  if (Array.isArray(store)) return store[0]?.name ?? "店舗";
  return store.name;
}

function normalizeCategoryLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getCategoryEntries(
  categories: Record<string, unknown> | null
): Array<{ key: string; value: number }> {
  if (!categories || typeof categories !== "object") return [];

  return Object.entries(categories)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([key, value]) => ({ key, value }));
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

export default async function EvaluationHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: trainerData } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const trainer = trainerData as TrainerRow | null;
  if (!trainer) redirect("/login");

  const { data } = await supabase
    .from("evaluations")
    .select("id, created_at, rating, comment, categories, store:stores(name)")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false });

  const evaluations = (data as EvaluationHistoryRow[] | null) ?? [];
  const ratings = evaluations
    .map((evaluation) => evaluation.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto animate-fade-in-up">
      <h1 className="font-heading text-2xl font-bold">評価履歴</h1>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">平均評価</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
            <Badge variant="secondary">{evaluations.length}件</Badge>
          </div>
          <div className="flex items-center gap-1">
            {renderStars(Math.round(avgRating), "h-5 w-5")}
          </div>
        </CardContent>
      </Card>

      {evaluations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            評価履歴はまだありません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 stagger-children">
          {evaluations.map((evaluation) => {
            const categoryEntries = getCategoryEntries(evaluation.categories);
            const rating = evaluation.rating ?? 0;

            return (
              <Card key={evaluation.id} className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {resolveStoreName(evaluation.store)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evaluation.created_at).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(rating, "h-4 w-4")}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {evaluation.comment?.trim() || "コメントはありません"}
                  </p>

                  {categoryEntries.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {categoryEntries.map((entry) => (
                          <div
                            key={`${evaluation.id}-${entry.key}`}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {normalizeCategoryLabel(entry.key)}
                            </span>
                            <div className="flex items-center gap-1">
                              {renderStars(entry.value, "h-3.5 w-3.5")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
