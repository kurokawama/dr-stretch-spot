"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getAllResignations,
  receiveResignation,
  completeResignation,
} from "@/actions/resignation";
import { FileText, CheckCircle2, Clock3, UserCheck } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  submitted: "提出済み",
  received: "受理済み",
  accepted: "承認済み",
  completed: "完了",
  cancelled: "取消",
};

const STATUS_VARIANTS: Record<string, "outline" | "default" | "destructive" | "secondary"> = {
  submitted: "outline",
  received: "default",
  accepted: "default",
  completed: "secondary",
  cancelled: "destructive",
};

const REASON_LABELS: Record<string, string> = {
  career_change: "キャリアチェンジ",
  family: "家庭の事情",
  health: "体調・健康",
  independence: "独立・開業",
  relocation: "転居",
  other: "その他",
};

interface ResignationRow {
  id: string;
  full_name: string;
  full_name_kana: string | null;
  employee_number: string | null;
  desired_resignation_date: string;
  last_working_date: string | null;
  resignation_reason: string | null;
  status: string;
  submitted_at: string | null;
  received_at: string | null;
  completed_at: string | null;
  spot_interest: boolean;
  store?: { name: string; area: string } | null;
}

export default function HrResignationsPage() {
  const [resignations, setResignations] = useState<ResignationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const data = await getAllResignations({ status: statusFilter });
    setResignations(data as unknown as ResignationRow[]);
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReceive = async (id: string) => {
    setActionLoading(id);
    const result = await receiveResignation(id);
    if (result.success) {
      toast.success("退職意向を受理しました。");
      await loadData();
    } else {
      toast.error(result.error ?? "受理に失敗しました。");
    }
    setActionLoading(null);
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id);
    const result = await completeResignation(id);
    if (result.success) {
      toast.success("退職完了処理が完了しました。退職者IDが発行されました。");
      await loadData();
    } else {
      toast.error(result.error ?? "完了処理に失敗しました。");
    }
    setActionLoading(null);
  };

  const pendingCount = resignations.filter((r) => r.status === "submitted").length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          退職意向管理
        </h1>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount}件 未受理
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="submitted">提出済み（未受理）</SelectItem>
            <SelectItem value="received">受理済み</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="cancelled">取消</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{resignations.length}件</span>
      </div>

      <div className="space-y-3">
        {resignations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              退職意向はありません。
            </CardContent>
          </Card>
        ) : (
          resignations.map((r) => (
            <Card key={r.id} className={r.status === "submitted" ? "border-amber-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.full_name}</p>
                      {r.full_name_kana && (
                        <span className="text-xs text-muted-foreground">({r.full_name_kana})</span>
                      )}
                      <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.employee_number && <span>社員番号: {r.employee_number}</span>}
                      {r.store && <span>所属: {r.store.name} ({r.store.area})</span>}
                      <span>退職希望日: {r.desired_resignation_date}</span>
                      {r.last_working_date && <span>最終出勤: {r.last_working_date}</span>}
                      {r.resignation_reason && (
                        <span>理由: {REASON_LABELS[r.resignation_reason] ?? r.resignation_reason}</span>
                      )}
                    </div>
                    {r.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        提出日: {new Date(r.submitted_at).toLocaleDateString("ja-JP")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.status === "submitted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReceive(r.id)}
                        disabled={actionLoading === r.id}
                      >
                        <Clock3 className="h-3.5 w-3.5 mr-1" />
                        受理
                      </Button>
                    )}
                    {(r.status === "received" || r.status === "accepted") && (
                      <Button
                        size="sm"
                        onClick={() => handleComplete(r.id)}
                        disabled={actionLoading === r.id}
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        退職完了
                      </Button>
                    )}
                    {r.status === "completed" && (
                      <div className="flex items-center text-green-600 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        完了
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
