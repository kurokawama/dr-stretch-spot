"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { approveApplication, rejectApplication } from "@/actions/applications";
import { toast } from "sonner";
import type { ShiftApplication } from "@/types/database";
import { CheckCircle, XCircle } from "lucide-react";

interface ApplicationListProps {
  initialData: ShiftApplication[];
  storeId: string;
}

export function ApplicationList({ initialData }: ApplicationListProps) {
  const router = useRouter();
  const [applications] = useState(initialData);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const handleApprove = async (applicationId: string) => {
    setProcessing(applicationId);
    const result = await approveApplication(applicationId);
    setProcessing(null);

    if (result.success) {
      toast.success("承認しました");
      router.refresh();
    } else {
      toast.error(result.error ?? "承認に失敗しました");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget);
    const result = await rejectApplication(rejectTarget);
    setProcessing(null);
    setRejectTarget(null);

    if (result.success) {
      toast.success("拒否しました");
      router.refresh();
    } else {
      toast.error(result.error ?? "拒否に失敗しました");
    }
  };

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved");

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          未審査の応募
          {pending.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pending.length}
            </Badge>
          )}
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
            未審査の応募はありません
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>トレーナー</TableHead>
                  <TableHead>シフト</TableHead>
                  <TableHead>日時</TableHead>
                  <TableHead className="text-right">確定時給</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((app) => {
                  const trainer = app.trainer as unknown as {
                    full_name: string;
                    tenure_years: number;
                    blank_status: string;
                  } | null;
                  const shift = app.shift_request as unknown as {
                    title: string;
                    shift_date: string;
                    start_time: string;
                    end_time: string;
                    is_emergency: boolean;
                  } | null;

                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {trainer?.full_name ?? "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            在籍{trainer?.tenure_years ?? 0}年
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{shift?.title}</span>
                          {shift?.is_emergency && (
                            <Badge variant="destructive" className="text-xs">
                              緊急
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {shift?.shift_date} {shift?.start_time}〜
                        {shift?.end_time}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ¥{app.confirmed_rate?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(app.id)}
                            disabled={processing === app.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            承認
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget(app.id)}
                            disabled={processing === app.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            拒否
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Approved Applications */}
      {approved.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">承認済み</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>トレーナー</TableHead>
                  <TableHead>シフト</TableHead>
                  <TableHead>日時</TableHead>
                  <TableHead className="text-right">確定時給</TableHead>
                  <TableHead className="text-right">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map((app) => {
                  const trainer = app.trainer as unknown as {
                    full_name: string;
                  } | null;
                  const shift = app.shift_request as unknown as {
                    title: string;
                    shift_date: string;
                    start_time: string;
                    end_time: string;
                  } | null;

                  return (
                    <TableRow key={app.id}>
                      <TableCell className="text-sm font-medium">
                        {trainer?.full_name ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {shift?.title}
                      </TableCell>
                      <TableCell className="text-sm">
                        {shift?.shift_date} {shift?.start_time}〜
                        {shift?.end_time}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ¥{app.confirmed_rate?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">承認済</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      <AlertDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>応募を拒否しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。トレーナーに通知されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject}>
              拒否する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
