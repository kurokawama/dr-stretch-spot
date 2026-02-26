"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, LogIn, LogOut } from "lucide-react";
import { getTodayAttendance, clockIn, clockOut } from "@/actions/attendance";
import type { AttendanceRecord } from "@/types/database";
import { toast } from "sonner";

export default function ClockPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    async function load() {
      const result = await getTodayAttendance();
      if (result.success && result.data) setRecords(result.data);
      setLoading(false);
    }
    load();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClockIn = async (attendanceId: string) => {
    setActionLoading(attendanceId);
    let lat: number | undefined;
    let lng: number | undefined;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS unavailable, proceed without
      }
    }

    const result = await clockIn({ attendance_id: attendanceId, latitude: lat, longitude: lng });
    setActionLoading(null);

    if (result.success) {
      toast.success("出勤しました！");
      const refreshed = await getTodayAttendance();
      if (refreshed.success && refreshed.data) setRecords(refreshed.data);
    } else {
      toast.error(result.error || "出勤打刻に失敗しました");
    }
  };

  const handleClockOut = async (attendanceId: string) => {
    setActionLoading(attendanceId);
    let lat: number | undefined;
    let lng: number | undefined;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS unavailable
      }
    }

    const result = await clockOut({ attendance_id: attendanceId, latitude: lat, longitude: lng });
    setActionLoading(null);

    if (result.success) {
      toast.success("退勤しました！");
      const refreshed = await getTodayAttendance();
      if (refreshed.success && refreshed.data) setRecords(refreshed.data);
    } else {
      toast.error(result.error || "退勤打刻に失敗しました");
    }
  };

  const statusLabels: Record<string, string> = {
    scheduled: "予定", clocked_in: "出勤中", clocked_out: "退勤済", verified: "確認済",
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">打刻</h1>

      <Card>
        <CardContent className="flex flex-col items-center py-6">
          <Clock className="h-8 w-8 text-primary mb-2" />
          <p className="text-4xl font-bold font-heading tabular-nums">
            {currentTime.toLocaleTimeString("ja-JP")}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </p>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">本日のシフトはありません</p>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const store = record.store as unknown as { name: string; address: string } | undefined;
            return (
              <Card key={record.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{store?.name ?? "店舗"}</CardTitle>
                    <Badge variant={record.status === "clocked_in" ? "default" : "outline"}>
                      {statusLabels[record.status] ?? record.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{store?.address}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    {record.scheduled_start} 〜 {record.scheduled_end}
                  </p>

                  {record.status === "scheduled" && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleClockIn(record.id)}
                      disabled={actionLoading === record.id}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {actionLoading === record.id ? "処理中..." : "出勤する"}
                    </Button>
                  )}

                  {record.status === "clocked_in" && (
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={() => handleClockOut(record.id)}
                      disabled={actionLoading === record.id}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {actionLoading === record.id ? "処理中..." : "退勤する"}
                    </Button>
                  )}

                  {record.clock_in_at && (
                    <p className="text-xs text-muted-foreground">
                      出勤: {new Date(record.clock_in_at).toLocaleTimeString("ja-JP")}
                      {record.is_location_verified && " ✅ 位置確認済"}
                    </p>
                  )}
                  {record.clock_out_at && (
                    <p className="text-xs text-muted-foreground">
                      退勤: {new Date(record.clock_out_at).toLocaleTimeString("ja-JP")}
                      {record.actual_work_minutes != null && ` (${Math.floor(record.actual_work_minutes / 60)}h${record.actual_work_minutes % 60}m)`}
                    </p>
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
