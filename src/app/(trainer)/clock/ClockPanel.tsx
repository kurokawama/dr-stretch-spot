"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn, clockOut } from "@/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrentTimeJP,
  formatDateJP,
  formatTimeJP,
} from "@/lib/formatters";
import type { AttendanceRecord } from "@/types/database";
import { toast } from "sonner";

interface ClockPanelProps {
  initialRecords: AttendanceRecord[];
}

type GpsState =
  | { status: "idle"; message: string; latitude?: number; longitude?: number }
  | { status: "loading"; message: string; latitude?: number; longitude?: number }
  | { status: "ready"; message: string; latitude: number; longitude: number }
  | { status: "error"; message: string; latitude?: number; longitude?: number };

const attendanceStatusLabel: Record<string, string> = {
  scheduled: "予定",
  clocked_in: "出勤中",
  clocked_out: "退勤済み",
  verified: "確定",
  disputed: "要確認",
};

const attendanceStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "outline",
  clocked_in: "default",
  clocked_out: "secondary",
  verified: "secondary",
  disputed: "destructive",
};

export function ClockPanel({ initialRecords }: ClockPanelProps) {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [gpsState, setGpsState] = useState<GpsState>({
    status: "idle",
    message: "未取得",
  });
  const [now, setNow] = useState(new Date());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState({
        status: "error",
        message: "この端末ではGPSが利用できません。",
      });
      return;
    }

    setGpsState({ status: "loading", message: "位置情報を取得中..." });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsState({
          status: "ready",
          message: "取得済み",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setGpsState({
          status: "error",
          message: "位置情報の取得に失敗しました。",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const activeRecord = useMemo(() => {
    return (
      records.find((record) => record.status === "clocked_in") ??
      records.find((record) => record.status === "scheduled") ??
      null
    );
  }, [records]);

  const actionLabel = activeRecord?.status === "clocked_in" ? "退勤" : "出勤";

  const handleClockAction = () => {
    if (!activeRecord) {
      toast.error("打刻可能なシフトがありません。");
      return;
    }

    startTransition(async () => {
      const payload = {
        attendance_id: activeRecord.id,
        latitude: gpsState.status === "ready" ? gpsState.latitude : undefined,
        longitude: gpsState.status === "ready" ? gpsState.longitude : undefined,
      };

      const result =
        activeRecord.status === "clocked_in"
          ? await clockOut(payload)
          : await clockIn(payload);

      if (!result.success) {
        toast.error(result.error ?? "打刻に失敗しました。");
        return;
      }

      toast.success(
        activeRecord.status === "clocked_in" ? "退勤を記録しました。" : "出勤を記録しました。"
      );

      setRecords((prev) =>
        prev.map((record) => {
          if (record.id !== activeRecord.id) return record;
          return {
            ...record,
            status: activeRecord.status === "clocked_in" ? "clocked_out" : "clocked_in",
            clock_in_at:
              activeRecord.status === "clocked_in"
                ? record.clock_in_at
                : new Date().toISOString(),
            clock_out_at:
              activeRecord.status === "clocked_in"
                ? new Date().toISOString()
                : record.clock_out_at,
          };
        })
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">現在時刻</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-3xl font-bold">{formatCurrentTimeJP(now)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GPS状態</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{gpsState.message}</span>
          <Badge
            variant={
              gpsState.status === "ready"
                ? "default"
                : gpsState.status === "error"
                  ? "destructive"
                  : "outline"
            }
          >
            {gpsState.status === "ready"
              ? "有効"
              : gpsState.status === "error"
                ? "エラー"
                : "取得中"}
          </Badge>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="h-16 w-full text-lg font-semibold"
        onClick={handleClockAction}
        disabled={!activeRecord || isPending}
      >
        {isPending ? "処理中..." : `${actionLabel}を記録`}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本日の予定シフト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">本日の予定はありません。</p>
          ) : (
            records.map((record) => (
              <div key={record.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{record.store?.name ?? "店舗未設定"}</p>
                  <Badge variant={attendanceStatusVariant[record.status] ?? "outline"}>
                    {attendanceStatusLabel[record.status] ?? record.status}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {formatDateJP(record.shift_date)} {formatTimeJP(record.scheduled_start)} -{" "}
                  {formatTimeJP(record.scheduled_end)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
