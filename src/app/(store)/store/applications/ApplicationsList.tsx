"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveApplication, rejectApplication } from "@/actions/applications";
import { ApplicationStatusBadge } from "@/components/shared/ApplicationStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateJP, formatDateTimeJP, formatTimeJP, formatYen } from "@/lib/formatters";
import type { ApplicationStatus } from "@/types/database";
import { toast } from "sonner";

interface ApplicationListItem {
  id: string;
  status: ApplicationStatus;
  confirmed_rate: number;
  applied_at: string;
  trainer: {
    full_name: string;
    tenure_years: number;
  } | null;
  shift_request: {
    title: string;
    shift_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

interface ApplicationsListProps {
  initialItems: ApplicationListItem[];
}

export function ApplicationsList({ initialItems }: ApplicationsListProps) {
  const router = useRouter();
  const [items, setItems] = useState<ApplicationListItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  const handleReview = (applicationId: string, decision: "approve" | "reject") => {
    startTransition(async () => {
      const result =
        decision === "approve"
          ? await approveApplication(applicationId)
          : await rejectApplication(applicationId);

      if (!result.success) {
        toast.error(result.error ?? "処理に失敗しました。");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === applicationId
            ? { ...item, status: decision === "approve" ? "approved" : "rejected" }
            : item
        )
      );
      toast.success(decision === "approve" ? "承認しました。" : "却下しました。");
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          承認待ち応募はありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{item.trainer?.full_name ?? "トレーナー未設定"}</p>
              <ApplicationStatusBadge status={item.status} />
            </div>
            <p className="text-muted-foreground">在籍年数: {item.trainer?.tenure_years ?? 0}年</p>
            <p className="text-muted-foreground">時給: {formatYen(item.confirmed_rate)}</p>
            <p className="text-muted-foreground">
              応募日時: {formatDateTimeJP(item.applied_at)}
            </p>
            <p className="text-muted-foreground">
              {item.shift_request?.title ?? "シフト未設定"} /{" "}
              {formatDateJP(item.shift_request?.shift_date ?? null)}{" "}
              {formatTimeJP(item.shift_request?.start_time ?? null)} -{" "}
              {formatTimeJP(item.shift_request?.end_time ?? null)}
            </p>
            {item.status === "pending" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  onClick={() => handleReview(item.id, "approve")}
                  disabled={isPending}
                >
                  承認
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview(item.id, "reject")}
                  disabled={isPending}
                >
                  却下
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
