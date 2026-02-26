import Link from "next/link";
import { searchShifts } from "@/actions/shifts";
import { createClient } from "@/lib/supabase/server";
import { formatShiftDateTimeRangeJP, formatYen } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShiftSearchFilters } from "./ShiftSearchFilters";
import type { ShiftRequest } from "@/types/database";

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

interface TrainerShiftsPageProps {
  searchParams?: RawSearchParams | Promise<RawSearchParams>;
}

export default async function TrainerShiftsPage({
  searchParams,
}: TrainerShiftsPageProps) {
  const resolvedParams = (await Promise.resolve(
    searchParams ?? {}
  )) as RawSearchParams;

  const area = getSearchParamValue(resolvedParams, "area");
  const dateFrom = getSearchParamValue(resolvedParams, "dateFrom");
  const dateTo = getSearchParamValue(resolvedParams, "dateTo");
  const emergencyOnly = getSearchParamValue(resolvedParams, "emergency") === "1";

  const supabase = await createClient();
  const [searchResult, storeAreasResult, rateConfigResult] = await Promise.all([
    searchShifts({
      area: area || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      is_emergency: emergencyOnly ? true : undefined,
    }),
    supabase.from("stores").select("area").eq("status", "active"),
    supabase
      .from("hourly_rate_config")
      .select("base_rate")
      .eq("is_active", true),
  ]);

  const shifts: ShiftRequest[] = searchResult.success ? searchResult.data ?? [] : [];
  const areas = Array.from(
    new Set((storeAreasResult.data ?? []).map((item) => item.area))
  ).sort((a, b) => a.localeCompare(b, "ja"));

  const baseRates = (rateConfigResult.data ?? []).map((item) => item.base_rate);
  const minimumBaseRate = baseRates.length > 0 ? Math.min(...baseRates) : 0;
  const maximumBaseRate = baseRates.length > 0 ? Math.max(...baseRates) : 0;

  const getRateRangeLabel = (shift: ShiftRequest) => {
    const emergencyBonus = shift.is_emergency ? shift.emergency_bonus_amount ?? 0 : 0;
    const minRate = minimumBaseRate + emergencyBonus;
    const maxRate = maximumBaseRate + emergencyBonus;
    return `${formatYen(minRate)} - ${formatYen(maxRate)}`;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">シフト検索</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          エリア・日付・緊急募集条件で検索できます。
        </p>
      </div>

      <ShiftSearchFilters
        areas={areas}
        defaultValues={{
          area,
          dateFrom,
          dateTo,
          emergencyOnly,
        }}
      />

      <div className="space-y-3">
        {shifts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              条件に一致する募集がありません。
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => (
            <Card key={shift.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {shift.store?.name ?? "店舗未設定"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatShiftDateTimeRangeJP(
                        shift.shift_date,
                        shift.start_time,
                        shift.end_time
                      )}
                    </CardDescription>
                  </div>
                  {shift.is_emergency && (
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      緊急
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">時給目安: {getRateRangeLabel(shift)}</p>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    募集人数 {shift.filled_count}/{shift.required_count}名
                  </p>
                  <Button asChild size="sm">
                    <Link href={`/shifts/${shift.id}`}>詳細を見る</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
