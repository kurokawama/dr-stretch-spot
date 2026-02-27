"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Building, MapPin, Users } from "lucide-react";
import { getStoresWithManagers, updateStoreConfig } from "@/actions/admin";
import type { StoreWithManager } from "@/types/database";
import { toast } from "sonner";

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreWithManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [editStore, setEditStore] = useState<StoreWithManager | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    area: "",
    address: "",
    auto_confirm: false,
    emergency_budget_monthly: 0,
    cost_ceiling_override: 0,
  });

  const loadStores = useCallback(async () => {
    setLoading(true);
    const result = await getStoresWithManagers();
    if (result.success && result.data) {
      setStores(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const openEdit = (store: StoreWithManager) => {
    setEditStore(store);
    setEditForm({
      name: store.name,
      area: store.area,
      address: store.address,
      auto_confirm: store.auto_confirm,
      emergency_budget_monthly: store.emergency_budget_monthly,
      cost_ceiling_override: store.cost_ceiling_override ?? 0,
    });
  };

  const handleSave = async () => {
    if (!editStore) return;
    const result = await updateStoreConfig(editStore.id, {
      name: editForm.name,
      area: editForm.area,
      address: editForm.address,
      auto_confirm: editForm.auto_confirm,
      emergency_budget_monthly: editForm.emergency_budget_monthly,
      cost_ceiling_override: editForm.cost_ceiling_override || null,
    });
    if (result.success) {
      toast.success("店舗設定を更新しました");
      setEditStore(null);
      loadStores();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">店舗管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          全店舗の情報・設定を管理
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        {loading ? "読み込み中..." : `${stores.length}店舗`}
      </div>

      <Card className="border-0 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>店舗名</TableHead>
              <TableHead>エリア</TableHead>
              <TableHead>住所</TableHead>
              <TableHead>管理者</TableHead>
              <TableHead>自動承認</TableHead>
              <TableHead>緊急予算</TableHead>
              <TableHead>使用済</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {store.address}
                    </span>
                  </TableCell>
                  <TableCell>
                    {store.managers.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">
                          {store.managers[0].full_name}
                          {store.managers.length > 1 &&
                            ` +${store.managers.length - 1}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        未設定
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.auto_confirm ? "default" : "secondary"}>
                      {store.auto_confirm ? "ON" : "OFF"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    ¥{store.emergency_budget_monthly.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={budgetRate >= 80 ? "destructive" : "secondary"}
                    >
                      {budgetRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(store)}
                    >
                      編集
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editStore} onOpenChange={() => setEditStore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>店舗設定の編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>店舗名</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>エリア</Label>
              <Input
                value={editForm.area}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, area: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>住所</Label>
              <Input
                value={editForm.address}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.auto_confirm}
                onCheckedChange={(v) =>
                  setEditForm((f) => ({ ...f, auto_confirm: v }))
                }
              />
              <Label>自動承認</Label>
            </div>
            <div>
              <Label>月間緊急予算 (円)</Label>
              <Input
                type="number"
                value={editForm.emergency_budget_monthly}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    emergency_budget_monthly: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>コスト上限オーバーライド (円/時, 0=グローバル設定)</Label>
              <Input
                type="number"
                value={editForm.cost_ceiling_override}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    cost_ceiling_override: Number(e.target.value),
                  }))
                }
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
