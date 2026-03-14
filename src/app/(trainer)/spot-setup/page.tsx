"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { activateSpot, updateSpotStatus } from "@/actions/resignation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AREAS = [
  "北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州・沖縄",
];

const TIME_SLOTS = [
  { value: "morning", label: "午前", sub: "9:00-12:00", icon: "🌅" },
  { value: "afternoon", label: "午後", sub: "12:00-17:00", icon: "☀️" },
  { value: "evening", label: "夕方", sub: "17:00-21:00", icon: "🌙" },
  { value: "flexible", label: "フレキシブル", sub: "時間帯問わず", icon: "🔄" },
];

export default function SpotSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trainerInfo, setTrainerInfo] = useState<{
    fullName: string;
    tenureYears: number;
    startDate: string | null;
    endDate: string | null;
  } | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("alumni_trainers")
        .select("full_name, tenure_years, employment_start_date, employment_end_date")
        .eq("auth_user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setTrainerInfo({
              fullName: data.full_name,
              tenureYears: data.tenure_years,
              startDate: data.employment_start_date,
              endDate: data.employment_end_date,
            });
          }
        });
    });
  }, []);

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleComplete = async () => {
    if (selectedAreas.length === 0) {
      toast.error("希望エリアを選択してください。");
      setStep(2);
      return;
    }
    if (selectedSlots.length === 0) {
      toast.error("希望時間帯を選択してください。");
      setStep(3);
      return;
    }
    setLoading(true);
    try {
      const result = await activateSpot({
        preferredAreas: selectedAreas,
        preferredTimeSlots: selectedSlots,
        bio: bio || undefined,
      });
      if (result.success) {
        setStep(5); // completion screen
      } else {
        toast.error(result.error ?? "設定に失敗しました。");
      }
    } catch {
      toast.error("予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleNotInterested = async () => {
    await updateSpotStatus("inactive");
    toast.success("設定を保存しました。いつでも変更できます。");
    router.push("/home");
    router.refresh();
  };

  // Step 5: Completion!
  if (step === 5) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-3">
          <div className="text-5xl">🎉</div>
          <h1 className="font-heading text-2xl font-bold">登録が完了しました！</h1>
          {trainerInfo && (
            <p className="text-sm text-accent font-medium">
              あなたの{trainerInfo.tenureYears}年の経験は、店舗にとって大きな力です。
            </p>
          )}
          <p className="text-muted-foreground">
            早速シフトを探してみましょう
          </p>
        </div>

        {/* LINE連携誘導カード */}
        <Card className="w-full max-w-xs border-[#06C755]/30 bg-[#06C755]/5">
          <CardContent className="p-4 space-y-3 text-center">
            <p className="text-sm font-medium">LINEで通知を受け取りませんか？</p>
            <p className="text-xs text-muted-foreground">
              シフトオファーやリマインドをLINEで受け取れます。見逃しを防げます。
            </p>
            <Button
              asChild
              className="w-full bg-[#06C755] hover:bg-[#06C755]/90 text-white"
            >
              <Link href="/profile">
                LINEを連携する
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Button asChild size="lg" variant="outline" className="w-full max-w-xs">
          <Link href="/shifts">
            シフトを探す
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between px-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step >= s
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={cn(
                  "w-12 md:w-16 h-0.5 mx-1",
                  step > s ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Confirm info */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">情報確認</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              以下の情報で登録します。修正が必要な場合はプロフィールから変更できます。
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">氏名</span>
                <span className="text-sm font-medium">
                  {trainerInfo?.fullName ?? "読み込み中..."}
                </span>
              </div>
              {trainerInfo?.startDate && trainerInfo?.endDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">在籍期間</span>
                  <span className="text-sm font-medium">
                    {trainerInfo.startDate} 〜 {trainerInfo.endDate}
                  </span>
                </div>
              )}
              {trainerInfo?.tenureYears != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">在籍年数</span>
                  <span className="text-sm font-medium">{trainerInfo.tenureYears}年</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              次へ <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select areas */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">希望エリア</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              どのエリアで働きたいですか？（複数選択OK）
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm font-medium transition-all text-center",
                    selectedAreas.includes(area)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> 戻る
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (selectedAreas.length === 0) {
                    toast.error("エリアを1つ以上選択してください。");
                    return;
                  }
                  setStep(3);
                }}
              >
                次へ <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select time slots */}
      {step === 3 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">希望時間帯</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              いつ頃働きたいですか？（複数選択OK）
            </p>
            <div className="space-y-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => toggleSlot(slot.value)}
                  className={cn(
                    "w-full rounded-lg border-2 p-4 text-left transition-all flex items-center gap-3",
                    selectedSlots.includes(slot.value)
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{slot.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{slot.label}</p>
                    <p className="text-xs text-muted-foreground">{slot.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> 戻る
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (selectedSlots.length === 0) {
                    toast.error("時間帯を1つ以上選択してください。");
                    return;
                  }
                  setStep(4);
                }}
              >
                次へ <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Bio (optional) + Complete */}
      {step === 4 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">自己紹介（任意）</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              得意な施術や資格など、店舗へのアピールポイントがあれば記入してください。
            </p>
            <div className="space-y-2">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="例: ストレッチ施術歴6年、パーソナルトレーナー資格保有"
                rows={3}
              />
            </div>

            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-1 text-sm">
              <p className="font-medium text-primary">設定内容の確認</p>
              <p className="text-muted-foreground">エリア: {selectedAreas.join(", ")}</p>
              <p className="text-muted-foreground">
                時間帯: {selectedSlots.map((s) => TIME_SLOTS.find((t) => t.value === s)?.label).join(", ")}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> 戻る
              </Button>
              <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                {loading ? "設定中..." : "完了！"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not interested link */}
      {step < 5 && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleNotInterested}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            今は興味がない
          </button>
        </div>
      )}
    </div>
  );
}
