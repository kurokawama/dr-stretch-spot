"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Users,
  Search,
  Pencil,
  Save,
  X,
  MessageCircle,
} from "lucide-react";
import { getAllTrainers, updateTrainer } from "@/actions/admin";
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

const rankConfig: Record<string, { label: string; color: string }> = {
  bronze: { label: "ブロンズ", color: "bg-amber-700 text-white" },
  silver: { label: "シルバー", color: "bg-gray-400 text-white" },
  gold: { label: "ゴールド", color: "bg-yellow-500 text-white" },
  platinum: { label: "プラチナ", color: "bg-purple-600 text-white" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "アクティブ", color: "bg-green-100 text-green-800" },
  pending: { label: "保留中", color: "bg-yellow-100 text-yellow-800" },
  suspended: { label: "停止中", color: "bg-red-100 text-red-800" },
  inactive: { label: "非アクティブ", color: "bg-gray-100 text-gray-800" },
};

const spotStatusConfig: Record<string, string> = {
  registered: "登録済み",
  active: "アクティブ",
  inactive: "非アクティブ",
  paused: "一時停止",
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

export default function HRTrainersPage() {
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
    area: "",
    search: "",
  });

  const loadTrainers = useCallback(async () => {
    setLoading(true);
    const result = await getAllTrainers({
      status: filters.status || undefined,
      area: filters.area || undefined,
      search: filters.search || undefined,
    });
    if (result.success && result.data) {
      setTrainers(result.data);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadTrainers();
  }, [loadTrainers]);

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

  const cancelEdit = () => {
    setEditing(false);
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
      <div>
        <h1 className="text-2xl font-bold">トレーナー管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          トレーナー情報の閲覧・編集
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              <TableHead>ランク</TableHead>
              <TableHead>エリア</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.map((trainer) => {
              const rnk = rankConfig[trainer.rank] || rankConfig.bronze;
              const sts = statusConfig[trainer.status] || statusConfig.pending;
              return (
                <TableRow
                  key={trainer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedTrainer(trainer);
                    setEditing(false);
                  }}
                >
                  <TableCell className="font-medium">
                    {trainer.full_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {trainer.email}
                  </TableCell>
                  <TableCell>
                    <Badge className={rnk.color}>{rnk.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {trainer.preferred_areas
                      .map((a) => areaLabels[a] || a)
                      .join(", ") || "-"}
                  </TableCell>
                  <TableCell>
                    {trainer.line_user_id ? (
                      <Badge className="bg-green-500 text-white">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        連携済
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        未連携
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={sts.color}>{sts.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && trainers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    条件に一致するトレーナーがいません
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail / Edit Sheet */}
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
                    <Badge className={(rankConfig[selectedTrainer.rank] || rankConfig.bronze).color}>
                      {(rankConfig[selectedTrainer.rank] || rankConfig.bronze).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SPOT状態</p>
                    <Badge variant="outline">
                      {spotStatusConfig[selectedTrainer.spot_status] || selectedTrainer.spot_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ステータス</p>
                    <Badge className={(statusConfig[selectedTrainer.status] || statusConfig.pending).color}>
                      {(statusConfig[selectedTrainer.status] || statusConfig.pending).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LINE連携</p>
                    {selectedTrainer.line_user_id ? (
                      <div>
                        <Badge className="bg-green-500 text-white">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          連携済
                        </Badge>
                        {selectedTrainer.line_linked_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(selectedTrainer.line_linked_at).toLocaleDateString("ja-JP")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">未連携</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">最終勤務日</p>
                    <p className="text-sm">{selectedTrainer.last_shift_date || "未勤務"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">希望エリア</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTrainer.preferred_areas.map((area) => (
                      <Badge key={area} variant="outline" className="text-xs">
                        {areaLabels[area] || area}
                      </Badge>
                    ))}
                    {selectedTrainer.preferred_areas.length === 0 && (
                      <span className="text-sm text-muted-foreground">未設定</span>
                    )}
                  </div>
                </div>

                {selectedTrainer.certifications.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">資格</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTrainer.certifications.map((cert) => (
                        <Badge key={cert} className="text-xs">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrainer.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">自己紹介</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {selectedTrainer.bio}
                    </p>
                  </div>
                )}
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
                  <Label htmlFor="edit-name">氏名</Label>
                  <Input
                    id="edit-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">電話番号</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tenure">在籍年数</Label>
                  <Input
                    id="edit-tenure"
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
                  <Label htmlFor="edit-bio">自己紹介</Label>
                  <textarea
                    id="edit-bio"
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
                  <Button variant="outline" onClick={cancelEdit} className="flex-1">
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
