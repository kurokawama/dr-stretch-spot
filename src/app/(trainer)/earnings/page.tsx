import { createClient } from "@/lib/supabase/server";
import {
  formatDateJP,
  formatHoursFromMinutes,
  formatTimeJP,
  formatYen,
} from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRecord, ShiftApplication, ShiftRequest, Store } from "@/types/database";

type ApplicationLite = Pick<
  ShiftApplication,
  "id" | "confirmed_rate" | "rate_breakdown" | "shift_request_id" | "status"
>;

type ShiftLite = Pick<ShiftRequest, "id" | "title" | "store_id" | "shift_date" | "start_time" | "end_time">;
type StoreLite = Pick<Store, "id" | "name">;

function toMonthBoundary(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(
      2,
      "0"
    )}`;
  return { start: toKey(start), end: toKey(end) };
}

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold">収入</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            トレーナー情報が見つかりません。
          </CardContent>
        </Card>
      </div>
    );
  }

  const { start, end } = toMonthBoundary(new Date());

  const { data: attendanceRecords } = await supabase
    .from("attendance_records")
    .select(
      "id, application_id, shift_date, scheduled_start, scheduled_end, actual_work_minutes, status"
    )
    .eq("trainer_id", trainer.id)
    .in("status", ["clocked_out", "verified"])
    .gte("shift_date", start)
    .lte("shift_date", end)
    .order("shift_date", { ascending: false });

  const records = (attendanceRecords ?? []) as Pick<
    AttendanceRecord,
    | "id"
    | "application_id"
    | "shift_date"
    | "scheduled_start"
    | "scheduled_end"
    | "actual_work_minutes"
    | "status"
  >[];

  const applicationIds = Array.from(new Set(records.map((record) => record.application_id)));

  const applicationsResult =
    applicationIds.length > 0
      ? await supabase
          .from("shift_applications")
          .select("id, confirmed_rate, rate_breakdown, shift_request_id, status")
          .in("id", applicationIds)
      : { data: [] as ApplicationLite[] };

  const applications = (applicationsResult.data ?? []) as ApplicationLite[];
  const applicationMap = new Map(applications.map((application) => [application.id, application]));

  const shiftIds = Array.from(
    new Set(applications.map((application) => application.shift_request_id))
  );
  const shiftsResult =
    shiftIds.length > 0
      ? await supabase
          .from("shift_requests")
          .select("id, title, store_id, shift_date, start_time, end_time")
          .in("id", shiftIds)
      : { data: [] as ShiftLite[] };
  const shifts = (shiftsResult.data ?? []) as ShiftLite[];
  const shiftMap = new Map(shifts.map((shift) => [shift.id, shift]));

  const storeIds = Array.from(new Set(shifts.map((shift) => shift.store_id)));
  const storesResult =
    storeIds.length > 0
      ? await supabase.from("stores").select("id, name").in("id", storeIds)
      : { data: [] as StoreLite[] };
  const stores = (storesResult.data ?? []) as StoreLite[];
  const storeMap = new Map(stores.map((store) => [store.id, store]));

  const rows = records.map((record) => {
    const application = applicationMap.get(record.application_id);
    const shift = application ? shiftMap.get(application.shift_request_id) : undefined;
    const store = shift ? storeMap.get(shift.store_id) : undefined;
    const workedMinutes = record.actual_work_minutes ?? 0;
    const rate = application?.confirmed_rate ?? 0;
    const earning = Math.round((workedMinutes / 60) * rate);

    return {
      record,
      application,
      shift,
      store,
      workedMinutes,
      earning,
    };
  });

  const totalMinutes = rows.reduce((sum, row) => sum + row.workedMinutes, 0);
  const totalEarnings = rows.reduce((sum, row) => sum + row.earning, 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">収入</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          当月の勤務実績と時給内訳を確認できます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">月間サマリー</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">当月見込み収入</p>
            <p className="mt-1 text-xl font-semibold text-primary">
              {formatYen(totalEarnings)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">勤務時間</p>
            <p className="mt-1 text-xl font-semibold">{formatHoursFromMinutes(totalMinutes)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">完了シフト数</p>
            <p className="mt-1 text-xl font-semibold">{rows.length}件</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              当月の実績はまだありません。
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.record.id}>
              <CardContent className="space-y-3 pt-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{row.store?.name ?? "店舗未設定"}</p>
                  <p className="text-primary font-semibold">{formatYen(row.earning)}</p>
                </div>
                <p className="text-muted-foreground">
                  {formatDateJP(row.record.shift_date)} {formatTimeJP(row.record.scheduled_start)} -{" "}
                  {formatTimeJP(row.record.scheduled_end)}
                </p>
                <div className="grid gap-1 rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">時給内訳</p>
                  <p>基本: {formatYen(row.application?.rate_breakdown.base_rate ?? 0)}</p>
                  <p>
                    出勤ボーナス: +
                    {formatYen(row.application?.rate_breakdown.attendance_bonus ?? 0)}
                  </p>
                  <p>
                    緊急ボーナス: +
                    {formatYen(row.application?.rate_breakdown.emergency_bonus ?? 0)}
                  </p>
                  <p className="font-semibold">
                    確定時給: {formatYen(row.application?.rate_breakdown.total ?? 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
