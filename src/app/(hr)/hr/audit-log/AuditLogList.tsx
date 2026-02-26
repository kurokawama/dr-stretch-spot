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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { getAuditLogs } from "@/actions/rates";
import type { RateChangeLog } from "@/types/database";
import { toast } from "sonner";

const changeTypeLabels: Record<string, string> = {
  rate_update: "時給更新",
  rate_create: "時給追加",
  rate_delete: "時給削除",
  blank_rule_update: "ブランクルール更新",
  simulation: "シミュレーション",
};

const changeTypeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  rate_update: "default",
  rate_create: "secondary",
  rate_delete: "destructive",
  blank_rule_update: "outline",
  simulation: "secondary",
};

interface AuditLogListProps {
  initialData: RateChangeLog[];
}

export function AuditLogList({ initialData }: AuditLogListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [logs, setLogs] = useState<RateChangeLog[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<RateChangeLog | null>(null);

  const handleFilterChange = async (value: string) => {
    setFilter(value);
    setLoading(true);
    const result = await getAuditLogs(
      value !== "all" ? { change_type: value } : undefined
    );
    setLoading(false);

    if (result.success && result.data) {
      setLogs(result.data);
    } else {
      toast.error("ログの取得に失敗しました");
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    const result = await getAuditLogs(
      filter !== "all" ? { change_type: filter } : undefined
    );
    setLoading(false);

    if (result.success && result.data) {
      setLogs(result.data);
      router.refresh();
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="フィルター" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="rate_update">時給更新</SelectItem>
            <SelectItem value="rate_create">時給追加</SelectItem>
            <SelectItem value="rate_delete">時給削除</SelectItem>
            <SelectItem value="blank_rule_update">ブランクルール更新</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>変更者</TableHead>
              <TableHead>理由</TableHead>
              <TableHead className="text-right">影響トレーナー数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  変更履歴がありません
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={changeTypeColors[log.change_type] ?? "default"}>
                      {changeTypeLabels[log.change_type] ?? log.change_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(log.changed_by_manager as { full_name?: string })?.full_name ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">
                    {log.reason ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.affected_trainers_count > 0
                      ? `${log.affected_trainers_count}名`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log);
                        setDetailOpen(true);
                      }}
                    >
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>変更詳細</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">日時</p>
                  <p className="font-medium">
                    {formatDate(selectedLog.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">種別</p>
                  <Badge
                    variant={changeTypeColors[selectedLog.change_type] ?? "default"}
                  >
                    {changeTypeLabels[selectedLog.change_type] ??
                      selectedLog.change_type}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">変更理由</p>
                <p className="font-medium">{selectedLog.reason ?? "なし"}</p>
              </div>
              {selectedLog.old_values && (
                <div>
                  <p className="mb-1 text-muted-foreground">変更前</p>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_values && (
                <div>
                  <p className="mb-1 text-muted-foreground">変更後</p>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
