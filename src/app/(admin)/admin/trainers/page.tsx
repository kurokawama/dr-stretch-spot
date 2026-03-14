"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Users, Search, RefreshCw, Pencil, Save, X } from "lucide-react";
import { getAllTrainers, updateTrainer } from "@/actions/admin";
import { runBlankStatusBatch } from "@/actions/config";
import type { AlumniTrainer } from "@/types/database";
import { toast } from "sonner";

const AREAS = [
  "hokkaido", "tohoku", "kanto", "chubu",
  "kansai", "chugoku", "shikoku", "kyushu",
];

const areaLabels: Record<string, string> = {
  hokkaido: "北海道", tohoku: "東北", kanto: "関東", chubu: "中部",
  kansai: "関西", chugoku: "中国", shikoku: "四国", kyushu: "九州",
};

const blankStatusConfig: Record<string, { label: string; color: string }> = {
  ok: { label: "正常", color: "bg-green-100 text-green-800" },
  alert_60: { label: "60日アラート", color: "bg-amber-100 text-amber-800" },
  skill_check_required: { label: "スキルチェック要", color: "bg-orange-100 text-orange-800" },
  training_required: { label: "研修要", color: "bg-red-100 text-red-800" },
};

const rankConfig: Record<string, { label: string; color: string }> = {
  bronze: { label: "ブロンズ", color: "bg-amber-700 text-white" },
  silver: { label: "シルバー", color: "bg-gray-400 text-white" },
  gold: { label: "ゴールド", color: "bg-yellow-500 text-white" },
  platinum: { label: "プラチナ", color: "bg-purple-600 text-white" },
};

interface EditForm {
  full_name: string;
  phone: string;
  rank: string;
  status: string;
  spot_status: string;
  bio: string;
  tenure_years: number;
  preferred_areas: string[];
}

export default function AdminTrainersPage() {
  const [trainers, setTrainers] = useState<AlumniTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<AlumniTrainer | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    phone: "",
    rank: "",
    status: "",
    spot_status: "",
    bio: "",
    tenure_years: 0,
    preferred_areas: [],
  });
  const [filters, setFilters] = useState({
    status: "",
    blank_status: "",
    area: "",
    search: "",
  });

  const loadTrainers = useCallback(async () => {
    setLoading(true);
    const result = await getAllTrainers({
      status: filters.status || undefined,
      blank_status: filters.blank_status || undefined,
      area: filters.area || undefined,
      search: filters.search || undefined,
    });
    if (result.success && result.data) {
      setTrainers(result.data);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTrainers();
  }, [loadTrainers]);

  const handleBatchUpdate = async () => {
    const result = await runBlankStatusBatch();
    if (result.success && result.data) {
      toast.success(`${result.data.updated}名のステータスを更新しました`);
      loadTrainers();
    } else {
      toast.error(result.error || "バッチ更新に失敗しました");
    }
  };

  const startEdit = (trainer: AlumniTrainer) => {
    setEditForm({
      full_name: trainer.full_name,
      phone: trainer.phone || "",
      rank: trainer.rank,
      status: trainer.status,
      spot_status: trainer.spot_status,
      bio: trainer.bio || "",
      tenure_years: trainer.tenure_years,
      preferred_areas: [...trainer.preferred_areas],
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!selectedTrainer) return;
    setSaving(true);
    const result = await updateTrainer(selectedTrainer.id, {
      full_name: editForm.full_name,
      phone: editForm.phone || undefined,
      rank: editForm.rank,
      status: editForm.status,
      spot_status: editForm.spot_status,
      bio: editForm.bio || undefined,
      tenure_years: editForm.tenure_years,
      preferred_areas: editForm.preferred_areas,
    });
    setSaving(false);

    if (result.success) {
      toast.success("トレーナー情報を更新しました");
      setEditing(false);
      setSelectedTrainer(null);
      loadTrainers();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  const toggleArea = (area: string) => {
    setEditForm((f) => ({
      ...f,
      preferred_areas: f.preferred_areas.includes(area)
        ? f.preferred_areas.filter((a) => a !== area)
        : [...f.preferred_areas, area],
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">トレーナー管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            全トレーナーの状況を一覧で管理
          </p>
        </div>
        <Button variant="outline" onClick={handleBatchUpdate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          ブランク一括更新
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="名前・メールで検索"
                className="pl-9"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ステータス</SelectItem>
                <SelectItem value="active">アクティブ</SelectItem>
                <SelectItem value="pending">保留中</SelectItem>
                <SelectItem value="inactive">非アクティブ</SelectItem>
                <SelectItem value="suspended">停止中</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.blank_status}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  blank_status: v === "all" ? "" : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ブランクステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ブランク</SelectItem>
                <SelectItem value="ok">正常</SelectItem>
                <SelectItem value="alert_60">60日アラート</SelectItem>
                <SelectItem value="skill_check_required">
                  スキルチェック要
                </SelectItem>
                <SelectItem value="training_required">研修要</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.area}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, area: v === "all" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="エリア" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全エリア</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {areaLabels[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {loading ? "読み込み中..." : `${trainers.length}名のトレーナー`}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>在籍年数</TableHead>
              <TableHead>ランク</TableHead>
              <TableHead>ブランク</TableHead>
              <TableHead>最終勤務</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.map((trainer) => {
              const blankCfg =
                blankStatusConfig[trainer.blank_status] || blankStatusConfig.ok;
              const rnk = rankConfig[trainer.rank] || rankConfig.bronze;
              return (
                <TableRow
                  key={trainer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTrainer(trainer)}
                >
                  <TableCell className="font-medium">
                    {trainer.full_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {trainer.email}
                  </TableCell>
                  <TableCell>{trainer.tenure_years}年</TableCell>
                  <TableCell>
                    <Badge className={rnk.color}>{rnk.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={blankCfg.color}>{blankCfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {trainer.last_shift_date || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trainer.status === "active" ? "default" : "secondary"
                      }
                    >
                      {trainer.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && trainers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    条件に一致するトレーナーがいません
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedTrainer}
        onOpenChange={() => {
          setSelectedTrainer(null);
          setEditing(false);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTrainer && !editing && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>{selectedTrainer.full_name}</SheetTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(selectedTrainer)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    編集
                  </Button>
                </div>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">メール</p>
                    <p className="text-sm">{selectedTrainer.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">電話</p>
                    <p className="text-sm">{selectedTrainer.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">在籍年数</p>
                    <p className="text-sm">{selectedTrainer.tenure_years}年</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ランク</p>
                    <Badge
                      className={
                        (rankConfig[selectedTrainer.rank] || rankConfig.bronze)
                          .color
                      }
                    >
                      {
                        (rankConfig[selectedTrainer.rank] || rankConfig.bronze)
                          .label
                      }
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      ブランクステータス
                    </p>
                    <Badge
                      className={
                        (
                          blankStatusConfig[selectedTrainer.blank_status] ||
                          blankStatusConfig.ok
                        ).color
                      }
                    >
                      {
                        (
                          blankStatusConfig[selectedTrainer.blank_status] ||
                          blankStatusConfig.ok
                        ).label
                      }
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">最終勤務日</p>
                    <p className="text-sm">
                      {selectedTrainer.last_shift_date || "未勤務"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SPOT状態</p>
                    <Badge variant="outline">
                      {selectedTrainer.spot_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      ステータス
                    </p>
                    <Badge
                      variant={
                        selectedTrainer.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedTrainer.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    希望エリア
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTrainer.preferred_areas.map((area) => (
                      <Badge key={area} variant="outline" className="text-xs">
                        {areaLabels[area] || area}
                      </Badge>
                    ))}
                    {selectedTrainer.preferred_areas.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        未設定
                      </span>
                    )}
                  </div>
                </div>

                {selectedTrainer.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">自己紹介</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {selectedTrainer.bio}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">バッジ</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTrainer.badges.map((badge) => (
                      <Badge key={badge} className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                    {selectedTrainer.badges.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        バッジなし
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedTrainer && editing && (
            <>
              <SheetHeader>
                <SheetTitle>トレーナー編集</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-edit-name">氏名</Label>
                  <Input
                    id="admin-edit-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-edit-phone">電話番号</Label>
                  <Input
                    id="admin-edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-edit-tenure">在籍年数</Label>
                  <Input
                    id="admin-edit-tenure"
                    type="number"
                    min={0}
                    value={editForm.tenure_years}
                    onChange={(e) => setEditForm((f) => ({ ...f, tenure_years: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ランク</Label>
                  <Select
                    value={editForm.rank}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, rank: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bronze">ブロンズ</SelectItem>
                      <SelectItem value="silver">シルバー</SelectItem>
                      <SelectItem value="gold">ゴールド</SelectItem>
                      <SelectItem value="platinum">プラチナ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">保留中</SelectItem>
                      <SelectItem value="active">アクティブ</SelectItem>
                      <SelectItem value="suspended">停止中</SelectItem>
                      <SelectItem value="inactive">非アクティブ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>SPOT状態</Label>
                  <Select
                    value={editForm.spot_status}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, spot_status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">登録済み</SelectItem>
                      <SelectItem value="active">アクティブ</SelectItem>
                      <SelectItem value="inactive">非アクティブ</SelectItem>
                      <SelectItem value="paused">一時停止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>希望エリア</Label>
                  <div className="flex flex-wrap gap-2">
                    {AREAS.map((area) => (
                      <Badge
                        key={area}
                        variant={editForm.preferred_areas.includes(area) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArea(area)}
                      >
                        {areaLabels[area]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-edit-bio">自己紹介</Label>
                  <textarea
                    id="admin-edit-bio"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={editForm.bio}
                    onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "保存中..." : "保存"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                    <X className="h-4 w-4 mr-1" />
                    キャンセル
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
