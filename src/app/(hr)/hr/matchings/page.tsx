"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAllMatchings, hrCancelMatching } from "@/actions/matching";
import type { ShiftApplication } from "@/types/database";

const STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  approved: "確定",
  rejected: "却下",
  cancelled: "キャンセル",
  completed: "完了",
  no_show: "欠勤",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
  completed: "outline",
  no_show: "destructive",
};

export default function MatchingsPage() {
  const [matchings, setMatchings] = useState<ShiftApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    applicationId: string;
    trainerName: string;
  }>({ open: false, applicationId: "", trainerName: "" });
  const [cancelReason, setCancelReason] = useState("");

  const fetchMatchings = useCallback(async () => {
    setLoading(true);
    const filters: { status?: string } = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    const result = await getAllMatchings(filters);
    if (result.success) {
      setMatchings(result.data ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchMatchings();
  }, [fetchMatchings]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("キャンセル理由を入力してください");
      return;
    }
    const result = await hrCancelMatching(
      cancelDialog.applicationId,
      cancelReason
    );
    if (result.success) {
      toast.success("マッチングをキャンセルしました");
      setCancelDialog({ open: false, applicationId: "", trainerName: "" });
      setCancelReason("");
      fetchMatchings();
    } else {
      toast.error(result.error ?? "エラーが発生しました");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">マッチング管理</h1>
        <p className="text-muted-foreground">
          全マッチングの確認・キャンセル・人員管理
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="approved">確定</SelectItem>
            <SelectItem value="pending">承認待ち</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
            <SelectItem value="no_show">欠勤</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Matchings table */}
      <Card>
        <CardHeader>
          <CardTitle>
            マッチング一覧（{matchings.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : matchings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              該当するマッチングはありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>トレーナー</TableHead>
                  <TableHead>店舗</TableHead>
                  <TableHead>シフト</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>時給</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>前日確認</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.trainer?.full_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {m.shift_request?.store?.name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {m.shift_request?.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      {m.shift_request?.shift_date ?? "—"}
                    </TableCell>
                    <TableCell>
                      {m.shift_request?.start_time?.slice(0, 5)}〜
                      {m.shift_request?.end_time?.slice(0, 5)}
                    </TableCell>
                    <TableCell>¥{m.confirmed_rate?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[m.status] ?? "secondary"}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.status === "approved" ? (
                        m.pre_day_confirmed ? (
                          <Badge variant="outline" className="text-green-600">
                            確認済
                          </Badge>
                        ) : (
                          <Badge variant="secondary">未確認</Badge>
                        )
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {(m.status === "approved" || m.status === "pending") && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setCancelDialog({
                              open: true,
                              applicationId: m.id,
                              trainerName: m.trainer?.full_name ?? "",
                            })
                          }
                        >
                          キャンセル
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) =>
          setCancelDialog({ ...cancelDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>マッチングをキャンセル</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {cancelDialog.trainerName} のマッチングをキャンセルします。
            </p>
            <div>
              <label className="text-sm font-medium">キャンセル理由</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="キャンセル理由を入力..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCancelDialog({
                  open: false,
                  applicationId: "",
                  trainerName: "",
                })
              }
            >
              戻る
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              キャンセル実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
