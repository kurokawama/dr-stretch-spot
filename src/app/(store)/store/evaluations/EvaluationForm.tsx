"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createEvaluation } from "@/actions/evaluations";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface EvaluationFormProps {
  applicationId: string;
  trainerName: string;
  tenureYears: number;
  shiftTitle: string;
  shiftDate: string;
  shiftTime: string;
}

const categoryLabels = [
  { key: "technique", label: "技術力" },
  { key: "communication", label: "コミュニケーション" },
  { key: "punctuality", label: "時間厳守" },
  { key: "attitude", label: "勤務態度" },
];

export function EvaluationForm({
  applicationId,
  trainerName,
  tenureYears,
  shiftTitle,
  shiftDate,
  shiftTime,
}: EvaluationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleCategoryRate = (key: string, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("総合評価を選択してください");
      return;
    }

    setLoading(true);
    const result = await createEvaluation({
      application_id: applicationId,
      rating,
      categories: Object.keys(categories).length > 0 ? categories : undefined,
      comment: comment.trim() || undefined,
    });
    setLoading(false);

    if (result.success) {
      toast.success("評価を送信しました");
      setSubmitted(true);
      router.refresh();
    } else {
      toast.error(result.error ?? "評価の送信に失敗しました");
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4 text-center text-sm text-green-700">
          {trainerName}さんの評価を送信しました
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {trainerName}（在籍{tenureYears}年）
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {shiftTitle} — {shiftDate} {shiftTime}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Rating */}
        <div className="space-y-2">
          <Label>総合評価</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                className="p-0.5"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredStar || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {rating}/5
              </span>
            )}
          </div>
        </div>

        {/* Category Ratings */}
        <div className="space-y-3">
          <Label>カテゴリ別評価（任意）</Label>
          {categoryLabels.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleCategoryRate(key, star)}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        star <= (categories[key] ?? 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor={`comment-${applicationId}`}>コメント（任意）</Label>
          <Textarea
            id={`comment-${applicationId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="施術の質、接客態度など"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full sm:w-auto"
        >
          {loading ? "送信中..." : "評価を送信"}
        </Button>
      </CardContent>
    </Card>
  );
}
