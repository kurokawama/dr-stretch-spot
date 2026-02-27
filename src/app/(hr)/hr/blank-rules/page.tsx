"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Shield, RefreshCw, Users, AlertTriangle } from "lucide-react";
import { getBlankRules, updateBlankRule } from "@/actions/rates";
import { runBlankStatusBatch } from "@/actions/config";
import { getAllTrainers } from "@/actions/admin";
import type { BlankRuleConfig } from "@/types/database";
import { toast } from "sonner";

const ruleTypeLabels: Record<string, { label: string; color: string }> = {
  alert_60: { label: "60日アラート", color: "bg-amber-100 text-amber-800" },
  skill_check_required: { label: "スキルチェック要", color: "bg-orange-100 text-orange-800" },
  training_required: { label: "研修要", color: "bg-red-100 text-red-800" },
};

export default function BlankRulesPage() {
  const [rules, setRules] = useState<BlankRuleConfig[]>([]);
  const [affectedCounts, setAffectedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editRule, setEditRule] = useState<BlankRuleConfig | null>(null);
  const [editDays, setEditDays] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rulesResult, trainersResult] = await Promise.all([
      getBlankRules(),
      getAllTrainers({ status: "active" }),
    ]);

    if (rulesResult.success && rulesResult.data) {
      setRules(rulesResult.data);
    }

    // Calculate affected trainer counts per rule
    if (trainersResult.success && trainersResult.data) {
      const counts: Record<string, number> = {};
      const trainers = trainersResult.data;

      if (rulesResult.success && rulesResult.data) {
        for (const rule of rulesResult.data) {
          const today = new Date();
          counts[rule.rule_type] = trainers.filter((t) => {
            if (!t.last_shift_date) return true;
            const lastShift = new Date(t.last_shift_date);
            const daysSince = Math.floor(
              (today.getTime() - lastShift.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysSince >= rule.threshold_days;
          }).length;
        }
      }
      setAffectedCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBatch = async () => {
    setBatchRunning(true);
    const result = await runBlankStatusBatch();
    if (result.success && result.data) {
      toast.success(`${result.data.updated}名のステータスを更新しました`);
      loadData();
    } else {
      toast.error(result.error || "バッチ更新に失敗しました");
    }
    setBatchRunning(false);
  };

  const handleUpdateRule = async () => {
    if (!editRule) return;
    const result = await updateBlankRule(editRule.id, {
      threshold_days: editDays,
    }, `Threshold updated to ${editDays} days`);
    if (result.success) {
      toast.success("ルールを更新しました");
      setEditRule(null);
      loadData();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ブランクルール管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ブランク期間の閾値と必要アクションを管理
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleBatch}
          disabled={batchRunning}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${batchRunning ? "animate-spin" : ""}`}
          />
          ステータス一括更新
        </Button>
      </div>

      {/* Rules Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ブランクルール設定
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ルール種別</TableHead>
                <TableHead>閾値 (日)</TableHead>
                <TableHead>必要アクション</TableHead>
                <TableHead>対象トレーナー</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => {
                  const cfg = ruleTypeLabels[rule.rule_type] || {
                    label: rule.rule_type,
                    color: "bg-gray-100 text-gray-800",
                  };
                  const affected = affectedCounts[rule.rule_type] || 0;
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        {rule.threshold_days}日
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.action_required}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {affected > 0 ? (
                            <Badge variant="destructive">{affected}名</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              0名
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.is_active ? "default" : "secondary"}
                        >
                          {rule.is_active ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditRule(rule);
                            setEditDays(rule.threshold_days);
                          }}
                        >
                          編集
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Impact Preview */}
      {Object.values(affectedCounts).some((c) => c > 0) && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="font-medium text-sm">影響プレビュー</p>
            </div>
            <p className="text-sm text-muted-foreground">
              現在のルール設定で、アクティブトレーナーのうち上記の人数がそれぞれの閾値に該当します。
              「ステータス一括更新」で即時反映できます。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRule} onOpenChange={() => setEditRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ルール編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>種別</Label>
              <Input
                value={
                  editRule
                    ? ruleTypeLabels[editRule.rule_type]?.label ||
                      editRule.rule_type
                    : ""
                }
                disabled
              />
            </div>
            <div>
              <Label>閾値 (日数)</Label>
              <Input
                type="number"
                value={editDays}
                onChange={(e) => setEditDays(Number(e.target.value))}
                min={1}
              />
            </div>
            <Button onClick={handleUpdateRule} className="w-full">
              更新
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
