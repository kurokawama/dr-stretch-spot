"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { applyToShift } from "@/actions/applications";
import { previewHourlyRate } from "@/actions/pricing";
import { createClient } from "@/lib/supabase/client";
import type { RateBreakdown } from "@/types/database";
import { toast } from "sonner";
import Link from "next/link";

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const shiftId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(true);
  const [ratePreview, setRatePreview] = useState<RateBreakdown | null>(null);
  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftDate, setShiftDate] = useState("");

  useEffect(() => {
    async function loadPreview() {
      const supabase = createClient();
      const { data: shift } = await supabase
        .from("shift_requests")
        .select("title, shift_date, start_time, end_time")
        .eq("id", shiftId)
        .single();
      if (shift) {
        setShiftTitle(shift.title);
        setShiftDate(`${shift.shift_date} ${shift.start_time}〜${shift.end_time}`);
      }

      // Get actual rate preview from server
      const result = await previewHourlyRate(shiftId);
      if (result.success && result.data) {
        setRatePreview(result.data);
      }
      setRateLoading(false);
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
          {rateLoading ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              時給を計算中...
            </p>
          ) : ratePreview ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">基本時給（在籍{ratePreview.tenure_years}年）</span>
                <span>¥{ratePreview.base_rate.toLocaleString()}</span>
              </div>
              {ratePreview.attendance_bonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    出勤ボーナス（30日間 {ratePreview.attendance_count_30d}回）
                  </span>
                  <span className="text-green-600">+¥{ratePreview.attendance_bonus.toLocaleString()}</span>
                </div>
              )}
              {ratePreview.emergency_bonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">緊急手当</span>
                  <span className="text-amber-600">+¥{ratePreview.emergency_bonus.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>時給見込み</span>
                <span className="text-primary">¥{ratePreview.total.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                ※ 最終的な時給は応募確定時にサーバー側で確定されます
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              時給情報を取得できませんでした
            </p>
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
