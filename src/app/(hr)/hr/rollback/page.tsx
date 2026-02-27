"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RotateCcw, Plus, Clock, FileJson } from "lucide-react";
import {
  createConfigSnapshot,
  getConfigSnapshots,
  rollbackToSnapshot,
} from "@/actions/config";
import type { ConfigSnapshot, ConfigSnapshotType } from "@/types/database";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  rate_config: "時給テーブル",
  blank_rule_config: "ブランクルール",
  cost_ceiling: "コスト上限",
};

export default function RollbackPage() {
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState<ConfigSnapshot | null>(null);
  const [createForm, setCreateForm] = useState({
    type: "rate_config" as ConfigSnapshotType,
    description: "",
  });

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    const result = await getConfigSnapshots();
    if (result.success && result.data) {
      setSnapshots(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const handleCreate = async () => {
    if (!createForm.description.trim()) {
      toast.error("説明を入力してください");
      return;
    }
    const result = await createConfigSnapshot(
      createForm.type,
      createForm.description
    );
    if (result.success) {
      toast.success("スナップショットを作成しました");
      setShowCreate(false);
      setCreateForm({ type: "rate_config", description: "" });
      loadSnapshots();
    } else {
      toast.error(result.error || "作成に失敗しました");
    }
  };

  const handleRollback = async () => {
    if (!confirmRollback) return;
    const result = await rollbackToSnapshot(confirmRollback.id);
    if (result.success) {
      toast.success("設定を復元しました");
      setConfirmRollback(null);
      loadSnapshots();
    } else {
      toast.error(result.error || "復元に失敗しました");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ロールバック</h1>
          <p className="text-sm text-muted-foreground mt-1">
            設定のスナップショット管理と復元
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          スナップショット作成
        </Button>
      </div>

      {/* Snapshots */}
      <div className="space-y-3">
        {loading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">読み込み中...</p>
            </CardContent>
          </Card>
        ) : snapshots.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                スナップショットがありません
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                「スナップショット作成」で現在の設定を保存できます
              </p>
            </CardContent>
          </Card>
        ) : (
          snapshots.map((snapshot) => (
            <Card key={snapshot.id} className="border-0 shadow-sm card-interactive">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {typeLabels[snapshot.snapshot_type] ||
                          snapshot.snapshot_type}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(snapshot.created_at).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {snapshot.description || "説明なし"}
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
                        <FileJson className="h-3 w-3" />
                        データプレビュー
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-40">
                        {JSON.stringify(snapshot.snapshot_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRollback(snapshot)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    復元
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スナップショット作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>対象設定</Label>
              <Select
                value={createForm.type}
                onValueChange={(v) =>
                  setCreateForm((f) => ({
                    ...f,
                    type: v as ConfigSnapshotType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rate_config">時給テーブル</SelectItem>
                  <SelectItem value="blank_rule_config">
                    ブランクルール
                  </SelectItem>
                  <SelectItem value="cost_ceiling">コスト上限</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>説明</Label>
              <Input
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="変更前のバックアップ"
              />
            </div>
            <Button onClick={handleCreate} className="w-full">
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Rollback */}
      <AlertDialog
        open={!!confirmRollback}
        onOpenChange={() => setConfirmRollback(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>設定を復元しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRollback && (
                <>
                  「
                  {typeLabels[confirmRollback.snapshot_type] ||
                    confirmRollback.snapshot_type}
                  」を{" "}
                  {new Date(confirmRollback.created_at).toLocaleString("ja-JP")}{" "}
                  時点の設定に戻します。現在の設定は自動的にスナップショットとして保存されます。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>
              復元する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
