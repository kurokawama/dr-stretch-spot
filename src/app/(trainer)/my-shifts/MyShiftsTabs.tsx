"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelApplication } from "@/actions/applications";
import { ApplicationStatusBadge } from "@/components/shared/ApplicationStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateJP, formatTimeJP, formatYen } from "@/lib/formatters";
import type { ShiftApplication } from "@/types/database";
import { toast } from "sonner";

interface MyShiftsTabsProps {
  initialApplications: ShiftApplication[];
}

function isPastShift(shiftDate: string | undefined): boolean {
  if (!shiftDate) return false;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(
    2,
    "0"
  )}-${`${today.getDate()}`.padStart(2, "0")}`;
  return shiftDate < todayKey;
}

export function MyShiftsTabs({ initialApplications }: MyShiftsTabsProps) {
  const router = useRouter();
  const [applications, setApplications] =
    useState<ShiftApplication[]>(initialApplications);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const cancelled = applications.filter((app) => app.status === "cancelled");

    const past = applications.filter((app) => {
      if (app.status === "cancelled") return false;
      if (["completed", "rejected", "no_show"].includes(app.status)) return true;
      return isPastShift(app.shift_request?.shift_date);
    });

    const upcoming = applications.filter((app) => {
      if (app.status === "cancelled") return false;
      if (["completed", "rejected", "no_show"].includes(app.status)) return false;
      return !isPastShift(app.shift_request?.shift_date);
    });

    return { upcoming, past, cancelled };
  }, [applications]);

  const handleCancel = (applicationId: string) => {
    startTransition(async () => {
      const result = await cancelApplication(applicationId, "本人都合");
      if (!result.success) {
        toast.error(result.error ?? "キャンセルに失敗しました。");
        return;
      }

      toast.success("応募をキャンセルしました。");
      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId
            ? { ...application, status: "cancelled" }
            : application
        )
      );
      router.refresh();
    });
  };

  const renderApplicationCards = (items: ShiftApplication[]) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            対象のシフトはありません。
          </CardContent>
        </Card>
      );
    }

    return items.map((application) => {
      const shift = application.shift_request;
      return (
        <Card key={application.id}>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{shift?.store?.name ?? "店舗未設定"}</p>
              <ApplicationStatusBadge status={application.status} />
            </div>
            <p className="text-muted-foreground">
              {formatDateJP(shift?.shift_date ?? null)}{" "}
              {formatTimeJP(shift?.start_time)} - {formatTimeJP(shift?.end_time)}
            </p>
            <p className="text-muted-foreground">
              時給: {formatYen(application.confirmed_rate)}
            </p>
            {(application.status === "pending" || application.status === "approved") && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCancel(application.id)}
                disabled={isPending}
              >
                キャンセル
              </Button>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <Tabs defaultValue="upcoming" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upcoming">予定</TabsTrigger>
        <TabsTrigger value="past">過去</TabsTrigger>
        <TabsTrigger value="cancelled">キャンセル</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="space-y-3">
        {renderApplicationCards(grouped.upcoming)}
      </TabsContent>
      <TabsContent value="past" className="space-y-3">
        {renderApplicationCards(grouped.past)}
      </TabsContent>
      <TabsContent value="cancelled" className="space-y-3">
        {renderApplicationCards(grouped.cancelled)}
      </TabsContent>
    </Tabs>
  );
}
