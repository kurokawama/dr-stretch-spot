"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building,
} from "lucide-react";
import { getMonthlyBudgetReport } from "@/actions/admin";
import { getCostCeilingConfig } from "@/actions/config";
import type { BudgetReport, CostCeilingConfig } from "@/types/database";

export default function AdminCostsPage() {
  const [reports, setReports] = useState<BudgetReport[]>([]);
  const [ceiling, setCeiling] = useState<CostCeilingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reportResult, ceilingResult] = await Promise.all([
      getMonthlyBudgetReport(),
      getCostCeilingConfig(),
    ]);
    if (reportResult.success && reportResult.data) {
      setReports(reportResult.data);
    }
    if (ceilingResult.success && ceilingResult.data) {
      setCeiling(ceilingResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCost = reports.reduce((s, r) => s + r.total_shift_cost, 0);
  const totalEmergencyUsed = reports.reduce((s, r) => s + r.emergency_used, 0);
  const totalEmergencyBudget = reports.reduce(
    (s, r) => s + r.emergency_budget,
    0
  );
  const alertStores = reports.filter(
    (r) => r.emergency_budget > 0 && r.emergency_used / r.emergency_budget >= 0.8
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コスト管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          月間コスト・緊急予算の追跡
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              月間人件費合計
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              緊急予算消費
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalEmergencyUsed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              / ¥{totalEmergencyBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              時給上限
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ceiling ? `¥${ceiling.max_hourly_rate.toLocaleString()}` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">グローバル設定</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              予算超過アラート
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {alertStores.length}
            </div>
            <p className="text-xs text-muted-foreground">80%超過店舗</p>
          </CardContent>
        </Card>
      </div>

      {/* Store Budget Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            店舗別コスト状況
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead>エリア</TableHead>
                <TableHead>シフト数</TableHead>
                <TableHead>トレーナー数</TableHead>
                <TableHead>月間コスト</TableHead>
                <TableHead>緊急予算</TableHead>
                <TableHead>使用率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => {
                  const budgetRate =
                    report.emergency_budget > 0
                      ? Math.round(
                          (report.emergency_used / report.emergency_budget) *
                            100
                        )
                      : 0;
                  return (
                    <TableRow key={report.store_id}>
                      <TableCell className="font-medium">
                        {report.store_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.area}</Badge>
                      </TableCell>
                      <TableCell>{report.shift_count}</TableCell>
                      <TableCell>{report.trainer_count}</TableCell>
                      <TableCell>
                        ¥{report.total_shift_cost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        ¥{report.emergency_used.toLocaleString()} / ¥
                        {report.emergency_budget.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                budgetRate >= 100
                                  ? "bg-destructive"
                                  : budgetRate >= 80
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(budgetRate, 100)}%`,
                              }}
                            />
                          </div>
                          <Badge
                            variant={
                              budgetRate >= 80 ? "destructive" : "secondary"
                            }
                            className="text-xs"
                          >
                            {budgetRate}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
