import Link from "next/link";
import { redirect } from "next/navigation";
import { getShiftDetail } from "@/actions/shifts";
import { applyToShift } from "@/actions/applications";
import { calculateHourlyRate } from "@/actions/pricing";
import { createClient } from "@/lib/supabase/server";
import { formatDateJP, formatTimeJP, formatYen } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
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

interface ShiftDetailPageProps {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: RawSearchParams | Promise<RawSearchParams>;
}

export default async function ShiftDetailPage({
  params,
  searchParams,
}: ShiftDetailPageProps) {
  const { id } = await Promise.resolve(params);
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as RawSearchParams;

  const shiftResult = await getShiftDetail(id);
  if (!shiftResult.success || !shiftResult.data) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            シフト情報を取得できませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const shift = shiftResult.data;
  const errorMessage = getSearchParamValue(resolvedSearchParams, "error");

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

  let ratePreview: RateBreakdown | null = null;
  if (trainer?.id) {
    try {
      ratePreview = await calculateHourlyRate(trainer.id, id);
    } catch {
      ratePreview = null;
    }
  }

  async function handleQuickApply() {
    "use server";
    const result = await applyToShift(id);
    if (!result.success) {
      const message = encodeURIComponent(result.error ?? "応募に失敗しました。");
      redirect(`/shifts/${id}?error=${message}`);
    }
    redirect("/my-shifts");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{shift.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {shift.store?.name ?? "店舗未設定"}
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
          <CardTitle className="text-base">募集詳細</CardTitle>
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
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">休憩</span>
            <span>{shift.break_minutes}分</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">募集人数</span>
            <span>
              {shift.filled_count}/{shift.required_count}名
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">緊急募集</span>
            <span>
              {shift.is_emergency ? (
                <Badge className="bg-accent text-accent-foreground">対象</Badge>
              ) : (
                "通常"
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">時給プレビュー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ratePreview ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">基本時給</span>
                <span>{formatYen(ratePreview.base_rate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">出勤ボーナス</span>
                <span>+{formatYen(ratePreview.attendance_bonus)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">緊急ボーナス</span>
                <span>+{formatYen(ratePreview.emergency_bonus)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>見込み時給</span>
                <span className="text-primary">{formatYen(ratePreview.total)}</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">時給の試算ができませんでした。</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="outline">
          <Link href={`/shifts/${id}/apply`}>応募内容を確認</Link>
        </Button>
        <form action={handleQuickApply}>
          <Button type="submit" className="w-full">
            応募する
          </Button>
        </form>
      </div>
    </div>
  );
}
