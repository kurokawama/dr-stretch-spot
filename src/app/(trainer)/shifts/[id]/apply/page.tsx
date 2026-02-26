import Link from "next/link";
import { redirect } from "next/navigation";
import { applyToShift } from "@/actions/applications";
import { getShiftDetail } from "@/actions/shifts";
import { calculateHourlyRate } from "@/actions/pricing";
import { createClient } from "@/lib/supabase/server";
import { formatDateJP, formatTimeJP, formatYen } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RateBreakdown } from "@/types/database";

type RawSearchParams = Record<string, string | string[] | undefined>;

function getSearchParamValue(
  params: RawSearchParams,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

interface ShiftApplyPageProps {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: RawSearchParams | Promise<RawSearchParams>;
}

export default async function ShiftApplyPage({
  params,
  searchParams,
}: ShiftApplyPageProps) {
  const { id } = await Promise.resolve(params);
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as RawSearchParams;
  const errorMessage = getSearchParamValue(resolvedSearchParams, "error");

  const shiftResult = await getShiftDetail(id);
  if (!shiftResult.success || !shiftResult.data) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            応募対象のシフトが見つかりません。
          </CardContent>
        </Card>
      </div>
    );
  }

  const shift = shiftResult.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: trainer } = user
    ? await supabase
        .from("alumni_trainers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()
    : { data: null };

  let rateBreakdown: RateBreakdown | null = null;
  if (trainer?.id) {
    try {
      rateBreakdown = await calculateHourlyRate(trainer.id, id);
    } catch {
      rateBreakdown = null;
    }
  }

  async function handleConfirmApply() {
    "use server";
    const result = await applyToShift(id);
    if (!result.success) {
      const message = encodeURIComponent(result.error ?? "応募に失敗しました。");
      redirect(`/shifts/${id}/apply?error=${message}`);
    }
    redirect("/my-shifts");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">応募確認</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          内容を確認して応募を確定してください。
        </p>
      </div>

      {errorMessage ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">シフト情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">店舗</span>
            <span>{shift.store?.name ?? "店舗未設定"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">日付</span>
            <span>{formatDateJP(shift.shift_date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">時間</span>
            <span>
              {formatTimeJP(shift.start_time)} - {formatTimeJP(shift.end_time)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">時給内訳</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rateBreakdown ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">基本時給</span>
                <span>{formatYen(rateBreakdown.base_rate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">出勤ボーナス</span>
                <span>+{formatYen(rateBreakdown.attendance_bonus)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">緊急ボーナス</span>
                <span>+{formatYen(rateBreakdown.emergency_bonus)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>確定時給</span>
                <span className="text-primary">{formatYen(rateBreakdown.total)}</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">時給内訳を取得できませんでした。</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="outline">
          <Link href={`/shifts/${id}`}>キャンセル</Link>
        </Button>
        <form action={handleConfirmApply}>
          <Button type="submit" className="w-full">
            応募を確定
          </Button>
        </form>
      </div>
    </div>
  );
}
