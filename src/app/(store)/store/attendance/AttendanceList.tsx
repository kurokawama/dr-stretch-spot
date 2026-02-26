"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyAttendance } from "@/actions/attendance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateJP, formatDateTimeJP, formatTimeJP } from "@/lib/formatters";
import type { AttendanceStatus } from "@/types/database";
import { toast } from "sonner";

interface AttendanceListItem {
  id: string;
  status: AttendanceStatus;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  trainer: {
    full_name: string;
  } | null;
}

interface AttendanceListProps {
  initialItems: AttendanceListItem[];
}

const statusLabelMap: Record<AttendanceStatus, string> = {
  scheduled: "予定",
  clocked_in: "出勤中",
  clocked_out: "退勤済み",
  verified: "確定",
  disputed: "要確認",
};

const statusVariantMap: Record<
  AttendanceStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "outline",
  clocked_in: "default",
  clocked_out: "secondary",
  verified: "secondary",
  disputed: "destructive",
};

export function AttendanceList({ initialItems }: AttendanceListProps) {
  const router = useRouter();
  const [items, setItems] = useState<AttendanceListItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  const handleVerify = (attendanceId: string) => {
    startTransition(async () => {
      const result = await verifyAttendance(attendanceId);
      if (!result.success) {
        toast.error(result.error ?? "確定処理に失敗しました。");
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === attendanceId ? { ...item, status: "verified" } : item
        )
      );
      toast.success("勤怠を確定しました。");
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          本日の勤怠データはありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-2 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.trainer?.full_name ?? "トレーナー未設定"}</p>
              <Badge variant={statusVariantMap[item.status]}>
                {statusLabelMap[item.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {formatDateJP(item.shift_date)} {formatTimeJP(item.scheduled_start)} -{" "}
              {formatTimeJP(item.scheduled_end)}
            </p>
            <p className="text-muted-foreground">
              出勤: {formatDateTimeJP(item.clock_in_at)} / 退勤:{" "}
              {formatDateTimeJP(item.clock_out_at)}
            </p>
            {item.status === "clocked_out" ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => handleVerify(item.id)}
                disabled={isPending}
              >
                確定
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
