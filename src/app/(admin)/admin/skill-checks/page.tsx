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
import {
  ClipboardCheck,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  getSkillCheckSchedule,
  getTrainersRequiringChecks,
  createSkillCheck,
  updateSkillCheckResult,
} from "@/actions/admin";
import type { SkillCheck, AlumniTrainer, SkillCheckResult } from "@/types/database";
import { toast } from "sonner";

export default function AdminSkillChecksPage() {
  const [checks, setChecks] = useState<SkillCheck[]>([]);
  const [trainersNeedingChecks, setTrainersNeedingChecks] = useState<AlumniTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResult, setShowResult] = useState<SkillCheck | null>(null);
  const [createForm, setCreateForm] = useState({
    trainer_id: "",
    check_type: "skill_check" as "skill_check" | "training",
    check_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [resultForm, setResultForm] = useState({
    result: "pass" as SkillCheckResult,
    score: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [checksResult, trainersResult] = await Promise.all([
      getSkillCheckSchedule(),
      getTrainersRequiringChecks(),
    ]);
    if (checksResult.success && checksResult.data) {
      setChecks(checksResult.data);
    }
    if (trainersResult.success && trainersResult.data) {
      setTrainersNeedingChecks(trainersResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!createForm.trainer_id) {
      toast.error("トレーナーを選択してください");
      return;
    }
    const result = await createSkillCheck({
      trainer_id: createForm.trainer_id,
      check_type: createForm.check_type,
      check_date: createForm.check_date,
      notes: createForm.notes || undefined,
    });
    if (result.success) {
      toast.success("スケジュールを作成しました");
      setShowCreate(false);
      setCreateForm({
        trainer_id: "",
        check_type: "skill_check",
        check_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      loadData();
    } else {
      toast.error(result.error || "作成に失敗しました");
    }
  };

  const handleResult = async () => {
    if (!showResult) return;
    const result = await updateSkillCheckResult(
      showResult.id,
      resultForm.result,
      resultForm.score ? Number(resultForm.score) : undefined
    );
    if (result.success) {
      toast.success("結果を記録しました");
      setShowResult(null);
      loadData();
    } else {
      toast.error(result.error || "記録に失敗しました");
    }
  };

  const resultIcon = (result: string) => {
    switch (result) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const resultLabel = (result: string) => {
    switch (result) {
      case "pass": return "合格";
      case "fail": return "不合格";
      default: return "未実施";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">技術チェック管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            スキルチェック・研修のスケジュールと結果を管理
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          スケジュール作成
        </Button>
      </div>

      {/* Trainers needing attention */}
      {trainersNeedingChecks.length > 0 && (
        <Card className="border-0 shadow-md border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              対応が必要なトレーナー ({trainersNeedingChecks.length}名)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trainersNeedingChecks.map((trainer) => (
                <div
                  key={trainer.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{trainer.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      最終勤務: {trainer.last_shift_date || "未勤務"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        trainer.blank_status === "training_required"
                          ? "bg-red-100 text-red-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {trainer.blank_status === "training_required"
                        ? "研修要"
                        : "スキルチェック要"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCreateForm({
                          trainer_id: trainer.id,
                          check_type:
                            trainer.blank_status === "training_required"
                              ? "training"
                              : "skill_check",
                          check_date: new Date().toISOString().split("T")[0],
                          notes: "",
                        });
                        setShowCreate(true);
                      }}
                    >
                      スケジュール
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checks Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            チェック履歴
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>実施日</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>結果</TableHead>
                <TableHead>スコア</TableHead>
                <TableHead>備考</TableHead>
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
              ) : checks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      チェック履歴がありません
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                checks.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>{check.check_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {check.check_type === "training"
                          ? "研修"
                          : "スキルチェック"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        {resultIcon(check.result)}
                        {resultLabel(check.result)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {check.score !== null ? `${check.score}点` : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {check.notes || "-"}
                    </TableCell>
                    <TableCell>
                      {check.result === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowResult(check);
                            setResultForm({ result: "pass", score: "" });
                          }}
                        >
                          結果入力
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スケジュール作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>トレーナー</Label>
              <Select
                value={createForm.trainer_id}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, trainer_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="トレーナーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {trainersNeedingChecks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>種別</Label>
              <Select
                value={createForm.check_type}
                onValueChange={(v) =>
                  setCreateForm((f) => ({
                    ...f,
                    check_type: v as "skill_check" | "training",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skill_check">スキルチェック</SelectItem>
                  <SelectItem value="training">研修</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>実施日</Label>
              <Input
                type="date"
                value={createForm.check_date}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, check_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>備考</Label>
              <Input
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="任意のメモ"
              />
            </div>
            <Button onClick={handleCreate} className="w-full">
              作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={!!showResult} onOpenChange={() => setShowResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>結果入力</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>結果</Label>
              <Select
                value={resultForm.result}
                onValueChange={(v) =>
                  setResultForm((f) => ({
                    ...f,
                    result: v as SkillCheckResult,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">合格</SelectItem>
                  <SelectItem value="fail">不合格</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>スコア (任意)</Label>
              <Input
                type="number"
                value={resultForm.score}
                onChange={(e) =>
                  setResultForm((f) => ({ ...f, score: e.target.value }))
                }
                placeholder="0-100"
              />
            </div>
            <Button onClick={handleResult} className="w-full">
              記録する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
