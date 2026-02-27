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
import { DollarSign, TrendingUp, Save, Building } from "lucide-react";
import {
  getCostCeilingConfig,
  updateCostCeilingConfig,
  updateStoreEmergencyBudget,
} from "@/actions/config";
import { getStoresWithManagers } from "@/actions/admin";
import type { CostCeilingConfig, StoreWithManager } from "@/types/database";
import { toast } from "sonner";

export default function CostCeilingPage() {
  const [ceiling, setCeiling] = useState<CostCeilingConfig | null>(null);
  const [stores, setStores] = useState<StoreWithManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCeiling, setEditCeiling] = useState({
    max_hourly_rate: 0,
    active_employee_ratio_threshold: 0,
    per_store_emergency_budget_default: 0,
  });
  const [storeBudgets, setStoreBudgets] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ceilingResult, storesResult] = await Promise.all([
      getCostCeilingConfig(),
      getStoresWithManagers(),
    ]);

    if (ceilingResult.success && ceilingResult.data) {
      setCeiling(ceilingResult.data);
      setEditCeiling({
        max_hourly_rate: ceilingResult.data.max_hourly_rate,
        active_employee_ratio_threshold:
          ceilingResult.data.active_employee_ratio_threshold,
        per_store_emergency_budget_default:
          ceilingResult.data.per_store_emergency_budget_default,
      });
    }

    if (storesResult.success && storesResult.data) {
      setStores(storesResult.data);
      const budgets: Record<string, number> = {};
      storesResult.data.forEach((s) => {
        budgets[s.id] = s.emergency_budget_monthly;
      });
      setStoreBudgets(budgets);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCeiling = async () => {
    setSaving(true);
    const result = await updateCostCeilingConfig(editCeiling);
    if (result.success) {
      toast.success("コスト上限設定を更新しました");
      loadData();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
    setSaving(false);
  };

  const handleSaveStoreBudget = async (storeId: string) => {
    const budget = storeBudgets[storeId];
    if (budget === undefined) return;

    const result = await updateStoreEmergencyBudget(storeId, budget);
    if (result.success) {
      toast.success("予算を更新しました");
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">コスト上限管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          時給上限・店舗別緊急予算を設定
        </p>
      </div>

      {/* Global Settings */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            グローバルコスト上限
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>時給上限 (円)</Label>
              <Input
                type="number"
                value={editCeiling.max_hourly_rate}
                onChange={(e) =>
                  setEditCeiling((f) => ({
                    ...f,
                    max_hourly_rate: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                基本時給+ボーナスの合計上限
              </p>
            </div>
            <div>
              <Label>在籍社員比率閾値</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={editCeiling.active_employee_ratio_threshold}
                onChange={(e) =>
                  setEditCeiling((f) => ({
                    ...f,
                    active_employee_ratio_threshold: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                SPOT時給 &lt; 在籍社員の{" "}
                {Math.round(
                  editCeiling.active_employee_ratio_threshold * 100
                )}
                %
              </p>
            </div>
            <div>
              <Label>デフォルト緊急予算 (円/月)</Label>
              <Input
                type="number"
                value={editCeiling.per_store_emergency_budget_default}
                onChange={(e) =>
                  setEditCeiling((f) => ({
                    ...f,
                    per_store_emergency_budget_default: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                新規店舗の初期緊急予算
              </p>
            </div>
          </div>
          <Button onClick={handleSaveCeiling} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            設定を保存
          </Button>
        </CardContent>
      </Card>

      {/* Store Budgets */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            店舗別緊急予算
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead>エリア</TableHead>
                <TableHead>現在の予算</TableHead>
                <TableHead>使用済み</TableHead>
                <TableHead>使用率</TableHead>
                <TableHead>新しい予算</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => {
                const budgetRate =
                  store.emergency_budget_monthly > 0
                    ? Math.round(
                        (store.emergency_budget_used /
                          store.emergency_budget_monthly) *
                          100
                      )
                    : 0;
                return (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{store.area}</Badge>
                    </TableCell>
                    <TableCell>
                      ¥{store.emergency_budget_monthly.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      ¥{store.emergency_budget_used.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          budgetRate >= 80 ? "destructive" : "secondary"
                        }
                      >
                        {budgetRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-32"
                        value={storeBudgets[store.id] ?? 0}
                        onChange={(e) =>
                          setStoreBudgets((b) => ({
                            ...b,
                            [store.id]: Number(e.target.value),
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveStoreBudget(store.id)}
                      >
                        保存
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
