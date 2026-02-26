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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { updateBlankRule } from "@/actions/rates";
import type { BlankRuleConfig } from "@/types/database";
import { toast } from "sonner";

const ruleTypeLabels: Record<string, string> = {
  alert_60: "予防アラート",
  skill_check_required: "スキルチェック必要",
  training_required: "再研修必要",
};

const ruleTypeColors: Record<string, "default" | "secondary" | "destructive"> = {
  alert_60: "secondary",
  skill_check_required: "default",
  training_required: "destructive",
};

interface BlankRuleTableProps {
  initialData: BlankRuleConfig[];
}

export function BlankRuleTable({ initialData }: BlankRuleTableProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<BlankRuleConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    threshold_days: 0,
    description: "",
    reason: "",
  });

  const handleEdit = (rule: BlankRuleConfig) => {
    setSelectedRule(rule);
    setEditForm({
      threshold_days: rule.threshold_days,
      description: rule.description ?? "",
      reason: "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedRule || !editForm.reason.trim()) {
      toast.error("変更理由を入力してください");
      return;
    }
    setLoading(true);
    const result = await updateBlankRule(
      selectedRule.id,
      {
        threshold_days: editForm.threshold_days,
        description: editForm.description || undefined,
      },
      editForm.reason
    );
    setLoading(false);

    if (result.success) {
      toast.success("ブランクルールを更新しました");
      setEditOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ルールタイプ</TableHead>
              <TableHead className="text-right">閾値（日数）</TableHead>
              <TableHead>アクション</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Badge variant={ruleTypeColors[rule.rule_type] ?? "default"}>
                    {ruleTypeLabels[rule.rule_type] ?? rule.rule_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {rule.threshold_days}日
                </TableCell>
                <TableCell>{rule.action_required}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {rule.description}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(rule)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ブランクルールを編集</DialogTitle>
            <DialogDescription>
              {selectedRule &&
                `${ruleTypeLabels[selectedRule.rule_type]}の閾値を変更`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>閾値（日数）</Label>
              <Input
                type="number"
                value={editForm.threshold_days}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    threshold_days: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>変更理由 <span className="text-destructive">*</span></Label>
              <Textarea
                value={editForm.reason}
                onChange={(e) =>
                  setEditForm({ ...editForm, reason: e.target.value })
                }
                placeholder="例: 運用実態に合わせた閾値調整"
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
    </div>
  );
}
