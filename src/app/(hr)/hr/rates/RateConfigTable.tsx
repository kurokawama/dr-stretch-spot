"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { updateRateConfig, createRateConfig, deleteRateConfig } from "@/actions/rates";
import type { HourlyRateConfig } from "@/types/database";
import { toast } from "sonner";

interface RateConfigTableProps {
  initialData: HourlyRateConfig[];
}

export function RateConfigTable({ initialData }: RateConfigTableProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<HourlyRateConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    base_rate: 0,
    attendance_bonus_threshold: 0,
    attendance_bonus_amount: 0,
    reason: "",
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    tenure_min_years: 0,
    tenure_max_years: "",
    base_rate: 0,
    attendance_bonus_threshold: 5,
    attendance_bonus_amount: 200,
    effective_from: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const [deleteReason, setDeleteReason] = useState("");

  const handleEdit = (config: HourlyRateConfig) => {
    setSelectedConfig(config);
    setEditForm({
      base_rate: config.base_rate,
      attendance_bonus_threshold: config.attendance_bonus_threshold,
      attendance_bonus_amount: config.attendance_bonus_amount,
      reason: "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedConfig || !editForm.reason.trim()) {
      toast.error("変更理由を入力してください");
      return;
    }
    setLoading(true);
    const result = await updateRateConfig(
      selectedConfig.id,
      {
        base_rate: editForm.base_rate,
        attendance_bonus_threshold: editForm.attendance_bonus_threshold,
        attendance_bonus_amount: editForm.attendance_bonus_amount,
      },
      editForm.reason
    );
    setLoading(false);

    if (result.success) {
      toast.success("時給設定を更新しました");
      setEditOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  const handleCreateSubmit = async () => {
    if (!createForm.reason.trim()) {
      toast.error("作成理由を入力してください");
      return;
    }
    setLoading(true);
    const result = await createRateConfig(
      {
        tenure_min_years: createForm.tenure_min_years,
        tenure_max_years: createForm.tenure_max_years
          ? parseFloat(createForm.tenure_max_years)
          : null,
        base_rate: createForm.base_rate,
        attendance_bonus_threshold: createForm.attendance_bonus_threshold,
        attendance_bonus_amount: createForm.attendance_bonus_amount,
        effective_from: createForm.effective_from,
      },
      createForm.reason
    );
    setLoading(false);

    if (result.success) {
      toast.success("新しい時給設定を作成しました");
      setCreateOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "作成に失敗しました");
    }
  };

  const handleDelete = (config: HourlyRateConfig) => {
    setSelectedConfig(config);
    setDeleteReason("");
    setDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedConfig || !deleteReason.trim()) {
      toast.error("削除理由を入力してください");
      return;
    }
    setLoading(true);
    const result = await deleteRateConfig(selectedConfig.id, deleteReason);
    setLoading(false);

    if (result.success) {
      toast.success("時給設定を削除しました");
      setDeleteOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "削除に失敗しました");
    }
  };

  const formatYen = (amount: number) =>
    `¥${amount.toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              新規追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい時給設定を追加</DialogTitle>
              <DialogDescription>
                在籍年数に基づく新しい時給設定を追加します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>在籍年数（下限）</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={createForm.tenure_min_years}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        tenure_min_years: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>在籍年数（上限）</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="上限なし"
                    value={createForm.tenure_max_years}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        tenure_max_years: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>基本時給</Label>
                <Input
                  type="number"
                  value={createForm.base_rate}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      base_rate: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ボーナス閾値（回/30日）</Label>
                  <Input
                    type="number"
                    value={createForm.attendance_bonus_threshold}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        attendance_bonus_threshold: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>ボーナス額</Label>
                  <Input
                    type="number"
                    value={createForm.attendance_bonus_amount}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        attendance_bonus_amount: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>適用開始日</Label>
                <Input
                  type="date"
                  value={createForm.effective_from}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      effective_from: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>作成理由 <span className="text-destructive">*</span></Label>
                <Textarea
                  value={createForm.reason}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, reason: e.target.value })
                  }
                  placeholder="例: 新規等級の追加"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                キャンセル
              </Button>
              <Button onClick={handleCreateSubmit} disabled={loading}>
                {loading ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>在籍年数</TableHead>
              <TableHead className="text-right">基本時給</TableHead>
              <TableHead className="text-right">ボーナス閾値</TableHead>
              <TableHead className="text-right">ボーナス額</TableHead>
              <TableHead>適用開始</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  <Badge variant="outline">
                    {config.tenure_min_years}年
                    {config.tenure_max_years
                      ? ` 〜 ${config.tenure_max_years}年`
                      : " 以上"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatYen(config.base_rate)}
                </TableCell>
                <TableCell className="text-right">
                  {config.attendance_bonus_threshold}回/30日
                </TableCell>
                <TableCell className="text-right">
                  +{formatYen(config.attendance_bonus_amount)}
                </TableCell>
                <TableCell>{config.effective_from}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(config)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(config)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>時給設定を編集</DialogTitle>
            <DialogDescription>
              {selectedConfig &&
                `在籍${selectedConfig.tenure_min_years}年${
                  selectedConfig.tenure_max_years
                    ? `〜${selectedConfig.tenure_max_years}年`
                    : "以上"
                }の設定を変更`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>基本時給</Label>
              <Input
                type="number"
                value={editForm.base_rate}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    base_rate: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ボーナス閾値（回/30日）</Label>
                <Input
                  type="number"
                  value={editForm.attendance_bonus_threshold}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      attendance_bonus_threshold: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ボーナス額</Label>
                <Input
                  type="number"
                  value={editForm.attendance_bonus_amount}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      attendance_bonus_amount: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>変更理由 <span className="text-destructive">*</span></Label>
              <Textarea
                value={editForm.reason}
                onChange={(e) =>
                  setEditForm({ ...editForm, reason: e.target.value })
                }
                placeholder="例: 市場水準に合わせた調整"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEditSubmit} disabled={loading}>
              {loading ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>時給設定を削除</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。削除理由を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>削除理由 <span className="text-destructive">*</span></Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="例: 等級統合のため"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={loading}
            >
              {loading ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
