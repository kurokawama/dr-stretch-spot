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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const rejected = applications.filter(
    (a) => a.status === "rejected" || a.status === "cancelled"
  );

  const statusLabels: Record<string, string> = {
    pending: "審査待ち",
    approved: "承認済",
    rejected: "却下",
    cancelled: "キャンセル",
  };

  const renderApplicationRow = (
    app: ShiftApplication,
    showActions: boolean
  ) => {
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
          {shift?.shift_date} {shift?.start_time}〜{shift?.end_time}
        </TableCell>
        <TableCell className="text-right text-sm font-medium">
          {app.confirmed_rate
            ? `¥${app.confirmed_rate.toLocaleString()}`
            : "-"}
        </TableCell>
        <TableCell className="text-right">
          {showActions ? (
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
          ) : (
            <Badge
              variant={
                app.status === "approved"
                  ? "secondary"
                  : app.status === "rejected"
                    ? "destructive"
                    : "outline"
              }
            >
              {statusLabels[app.status] ?? app.status}
            </Badge>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (items: ShiftApplication[], showActions: boolean) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center border rounded-md">
          該当する応募はありません
        </p>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>トレーナー</TableHead>
              <TableHead>シフト</TableHead>
              <TableHead>日時</TableHead>
              <TableHead className="text-right">確定時給</TableHead>
              <TableHead className="text-right">
                {showActions ? "操作" : "ステータス"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((app) => renderApplicationRow(app, showActions))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            審査待ち
            {pending.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 h-5 min-w-5 px-1 text-xs"
              >
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            承認済み
            {approved.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({approved.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            却下・キャンセル
            {rejected.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({rejected.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {renderTable(pending, true)}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {renderTable(approved, false)}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {renderTable(rejected, false)}
        </TabsContent>
      </Tabs>

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
