"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { simulateRateChange } from "@/actions/pricing";
import type { HourlyRateConfig } from "@/types/database";
import { toast } from "sonner";

interface SimulationFormProps {
  currentConfigs: HourlyRateConfig[];
}

interface SimulationResult {
  affected_trainers: number;
  current_monthly_cost: number;
  projected_monthly_cost: number;
  difference: number;
}

export function SimulationForm({ currentConfigs }: SimulationFormProps) {
  const [editedRates, setEditedRates] = useState<
    Record<string, number>
  >(
    Object.fromEntries(currentConfigs.map((c) => [c.id, c.base_rate]))
  );
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRateChange = (id: string, value: number) => {
    setEditedRates({ ...editedRates, [id]: value });
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const newConfigs = currentConfigs.map((c) => ({
        tenure_min_years: c.tenure_min_years,
        tenure_max_years: c.tenure_max_years,
        base_rate: editedRates[c.id] ?? c.base_rate,
      }));

      const simResult = await simulateRateChange(newConfigs);
      setResult(simResult);
    } catch {
      toast.error("シミュレーションに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEditedRates(
      Object.fromEntries(currentConfigs.map((c) => [c.id, c.base_rate]))
    );
    setResult(null);
  };

  const formatYen = (amount: number) =>
    `¥${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">時給設定（変更案）</CardTitle>
          <CardDescription>
            各等級の基本時給を変更して「シミュレーション実行」を押してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>在籍年数</TableHead>
                  <TableHead className="text-right">現行時給</TableHead>
                  <TableHead className="text-right">変更後時給</TableHead>
                  <TableHead className="text-right">差額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentConfigs.map((config) => {
                  const current = config.base_rate;
                  const edited = editedRates[config.id] ?? current;
                  const diff = edited - current;

                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {config.tenure_min_years}年
                          {config.tenure_max_years
                            ? ` 〜 ${config.tenure_max_years}年`
                            : " 以上"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatYen(current)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <Label htmlFor={`rate-${config.id}`} className="sr-only">
                            時給
                          </Label>
                          <Input
                            id={`rate-${config.id}`}
                            type="number"
                            className="w-28 text-right"
                            value={edited}
                            onChange={(e) =>
                              handleRateChange(
                                config.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            diff > 0
                              ? "text-red-600"
                              : diff < 0
                                ? "text-green-600"
                                : "text-muted-foreground"
                          }
                        >
                          {diff > 0 ? "+" : ""}
                          {formatYen(diff)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSimulate} disabled={loading}>
              <Calculator className="mr-1 h-4 w-4" />
              {loading ? "計算中..." : "シミュレーション実行"}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">シミュレーション結果</CardTitle>
            <CardDescription>
              月間推定コスト比較（1人あたり月40時間稼働で試算）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  現行月間コスト
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatYen(result.current_monthly_cost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  対象: {result.affected_trainers}名
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  変更後月間コスト
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatYen(result.projected_monthly_cost)}
                </p>
              </div>
              <div
                className={`rounded-lg border p-4 ${
                  result.difference > 0
                    ? "border-red-200 bg-red-50"
                    : result.difference < 0
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200"
                }`}
              >
                <p className="text-sm text-muted-foreground">差額</p>
                <div className="mt-1 flex items-center gap-2">
                  {result.difference > 0 ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : result.difference < 0 ? (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <p
                    className={`text-2xl font-bold ${
                      result.difference > 0
                        ? "text-red-600"
                        : result.difference < 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {result.difference > 0 ? "+" : ""}
                    {formatYen(result.difference)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">月額</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
