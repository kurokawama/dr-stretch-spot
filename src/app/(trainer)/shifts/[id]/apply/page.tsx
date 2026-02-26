"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { applyToShift } from "@/actions/applications";
import { createClient } from "@/lib/supabase/client";
import type { RateBreakdown } from "@/types/database";
import { toast } from "sonner";
import Link from "next/link";

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const shiftId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [ratePreview, setRatePreview] = useState<RateBreakdown | null>(null);
  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftDate, setShiftDate] = useState("");

  useEffect(() => {
    async function loadPreview() {
      const supabase = createClient();
      const { data: shift } = await supabase
        .from("shift_requests")
        .select("title, shift_date, start_time, end_time, is_emergency, emergency_bonus_amount")
        .eq("id", shiftId)
        .single();
      if (shift) {
        setShiftTitle(shift.title);
        setShiftDate(`${shift.shift_date} ${shift.start_time}〜${shift.end_time}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: trainer } = await supabase
        .from("alumni_trainers")
        .select("tenure_years")
        .eq("auth_user_id", user.id)
        .single();

      if (trainer && shift) {
        // Simple preview calculation (actual rate is calculated server-side)
        setRatePreview({
          base_rate: 0,
          tenure_years: trainer.tenure_years,
          attendance_bonus: 0,
          attendance_count_30d: 0,
          emergency_bonus: shift.is_emergency ? (shift.emergency_bonus_amount ?? 0) : 0,
          total: 0,
        });
      }
    }
    loadPreview();
  }, [shiftId]);

  const handleApply = async () => {
    setLoading(true);
    const result = await applyToShift(shiftId);
    setLoading(false);

    if (result.success) {
      toast.success("応募が完了しました！");
      router.push("/my-shifts");
    } else {
      toast.error(result.error || "応募に失敗しました");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/shifts/${shiftId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          シフト詳細に戻る
        </Link>
      </Button>

      <h1 className="font-heading text-2xl font-bold">応募確認</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{shiftTitle || "シフト"}</CardTitle>
          <p className="text-sm text-muted-foreground">{shiftDate}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {ratePreview && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">在籍年数</span>
                <span>{ratePreview.tenure_years}年</span>
              </div>
              {ratePreview.emergency_bonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">緊急手当</span>
                  <span className="text-amber-600">+¥{ratePreview.emergency_bonus.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">
                ※ 正確な時給は応募時にサーバー側で確定されます（在籍年数・出勤ボーナス含む）
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button className="w-full" size="lg" onClick={handleApply} disabled={loading}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {loading ? "応募中..." : "応募を確定する"}
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/shifts/${shiftId}`}>キャンセル</Link>
        </Button>
      </div>
    </div>
  );
}
