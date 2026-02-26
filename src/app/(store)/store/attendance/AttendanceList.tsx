"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verifyAttendance } from "@/actions/attendance";
import { toast } from "sonner";
import type { AttendanceRecord } from "@/types/database";
import { CheckCircle, Clock, MapPin } from "lucide-react";

const statusLabels: Record<string, string> = {
  scheduled: "予定",
  clocked_in: "出勤中",
  clocked_out: "退勤済",
  verified: "確認済",
  disputed: "異議あり",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "outline",
  clocked_in: "default",
  clocked_out: "secondary",
  verified: "secondary",
  disputed: "destructive",
};

interface AttendanceListProps {
  todayRecords: AttendanceRecord[];
  recentRecords: AttendanceRecord[];
}

export function AttendanceList({
  todayRecords,
  recentRecords,
}: AttendanceListProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleVerify = async (attendanceId: string) => {
    setProcessing(attendanceId);
    const result = await verifyAttendance(attendanceId);
    setProcessing(null);

    if (result.success) {
      toast.success("出勤を確認しました");
      router.refresh();
    } else {
      toast.error(result.error ?? "確認に失敗しました");
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRecord = (record: AttendanceRecord) => {
    const trainer = record.trainer as unknown as { full_name: string } | null;

    return (
      <div
        key={record.id}
        className="flex items-center justify-between rounded-md border p-3"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{trainer?.full_name ?? "-"}</p>
            <Badge variant={statusVariants[record.status] ?? "outline"}>
              {statusLabels[record.status] ?? record.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {record.scheduled_start}〜{record.scheduled_end}
            </span>
            {record.is_location_verified && (
              <span className="flex items-center gap-1 text-green-600">
                <MapPin className="h-3 w-3" />
                GPS確認済
              </span>
            )}
          </div>
          {(record.clock_in_at || record.clock_out_at) && (
            <p className="text-xs text-muted-foreground">
              打刻: {formatTime(record.clock_in_at)} →{" "}
              {formatTime(record.clock_out_at)}
              {record.actual_work_minutes != null && (
                <span className="ml-2">
                  ({Math.floor(record.actual_work_minutes / 60)}時間
                  {record.actual_work_minutes % 60}分)
                </span>
              )}
            </p>
          )}
        </div>
        <div>
          {record.status === "clocked_out" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerify(record.id)}
              disabled={processing === record.id}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              確認
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            本日の出勤
            <Badge variant="outline" className="ml-2">
              {todayRecords.length}名
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              本日の出勤予定はありません
            </p>
          ) : (
            todayRecords.map(renderRecord)
          )}
        </CardContent>
      </Card>

      {recentRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">直近7日間</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRecords.map(renderRecord)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
