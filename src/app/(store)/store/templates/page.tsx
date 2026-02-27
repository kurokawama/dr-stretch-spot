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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Plus, Trash2, Edit2, CalendarPlus } from "lucide-react";
import {
  getShiftTemplates,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  createShiftFromTemplate,
} from "@/actions/templates";
import { createClient } from "@/lib/supabase/client";
import type { ShiftTemplate } from "@/types/database";
import { toast } from "sonner";

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ShiftTemplate | null>(null);
  const [showFromTemplate, setShowFromTemplate] = useState<string | null>(null);
  const [shiftDate, setShiftDate] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("18:00");
  const [formBreak, setFormBreak] = useState(60);
  const [formRequired, setFormRequired] = useState(1);
  const [formRecurring, setFormRecurring] = useState(false);
  const [formDays, setFormDays] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: manager } = await supabase
      .from("store_managers")
      .select("store_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!manager) return;
    setStoreId(manager.store_id);

    setLoading(true);
    const result = await getShiftTemplates(manager.store_id);
    if (result.success && result.data) {
      setTemplates(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormName("");
    setFormTitle("");
    setFormStart("09:00");
    setFormEnd("18:00");
    setFormBreak(60);
    setFormRequired(1);
    setFormRecurring(false);
    setFormDays([]);
  };

  const handleCreate = async () => {
    if (!storeId) return;
    const result = await createShiftTemplate({
      store_id: storeId,
      name: formName,
      title: formTitle,
      start_time: formStart,
      end_time: formEnd,
      break_minutes: formBreak,
      required_count: formRequired,
      is_recurring: formRecurring,
      recurring_days: formDays,
    });
    if (result.success) {
      toast.success("テンプレートを作成しました");
      setShowCreate(false);
      resetForm();
      loadData();
    } else {
      toast.error(result.error || "作成に失敗しました");
    }
  };

  const handleUpdate = async () => {
    if (!editTemplate) return;
    const result = await updateShiftTemplate(editTemplate.id, {
      name: formName,
      title: formTitle,
      start_time: formStart,
      end_time: formEnd,
      break_minutes: formBreak,
      required_count: formRequired,
      is_recurring: formRecurring,
      recurring_days: formDays,
    });
    if (result.success) {
      toast.success("テンプレートを更新しました");
      setEditTemplate(null);
      resetForm();
      loadData();
    } else {
      toast.error(result.error || "更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteShiftTemplate(id);
    if (result.success) {
      toast.success("テンプレートを削除しました");
      loadData();
    } else {
      toast.error(result.error || "削除に失敗しました");
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!showFromTemplate || !shiftDate) return;
    const result = await createShiftFromTemplate(showFromTemplate, shiftDate, []);
    if (result.success) {
      toast.success("テンプレートからシフトを作成しました");
      setShowFromTemplate(null);
      setShiftDate("");
    } else {
      toast.error(result.error || "シフト作成に失敗しました");
    }
  };

  const openEditDialog = (tmpl: ShiftTemplate) => {
    setEditTemplate(tmpl);
    setFormName(tmpl.name);
    setFormTitle(tmpl.title);
    setFormStart(tmpl.start_time);
    setFormEnd(tmpl.end_time);
    setFormBreak(tmpl.break_minutes);
    setFormRequired(tmpl.required_count);
    setFormRecurring(tmpl.is_recurring);
    setFormDays(tmpl.recurring_days ?? []);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">テンプレート管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            よく使うシフトパターンをテンプレートとして保存
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            シフトテンプレート一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>テンプレート名</TableHead>
                <TableHead>シフトタイトル</TableHead>
                <TableHead>時間帯</TableHead>
                <TableHead>必要人数</TableHead>
                <TableHead>繰返し</TableHead>
                <TableHead>状態</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    テンプレートがありません
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((tmpl) => (
                  <TableRow key={tmpl.id}>
                    <TableCell className="font-medium">{tmpl.name}</TableCell>
                    <TableCell>{tmpl.title}</TableCell>
                    <TableCell className="text-sm">
                      {tmpl.start_time} - {tmpl.end_time}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        休憩{tmpl.break_minutes}分
                      </span>
                    </TableCell>
                    <TableCell>{tmpl.required_count}名</TableCell>
                    <TableCell>
                      {tmpl.is_recurring ? (
                        <div className="flex flex-wrap gap-0.5">
                          {tmpl.recurring_days.map((d) => (
                            <Badge key={d} variant="secondary" className="text-xs px-1">
                              {dayLabels[d]}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          単発
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tmpl.is_active ? "default" : "secondary"}>
                        {tmpl.is_active ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowFromTemplate(tmpl.id)}
                          title="テンプレートからシフト作成"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(tmpl)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(tmpl.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={showCreate || !!editTemplate}
        onOpenChange={() => {
          setShowCreate(false);
          setEditTemplate(null);
          resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTemplate ? "テンプレート編集" : "新規テンプレート"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>テンプレート名</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: 午前シフト"
              />
            </div>
            <div>
              <Label>シフトタイトル</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例: 午前ストレッチ業務"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>開始時間</Label>
                <Input
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div>
                <Label>終了時間</Label>
                <Input
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>休憩 (分)</Label>
                <Input
                  type="number"
                  value={formBreak}
                  onChange={(e) => setFormBreak(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <Label>必要人数</Label>
                <Input
                  type="number"
                  value={formRequired}
                  onChange={(e) => setFormRequired(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={formRecurring}
                onChange={(e) => setFormRecurring(e.target.checked)}
              />
              <Label htmlFor="recurring">繰返しシフト</Label>
            </div>
            {formRecurring && (
              <div>
                <Label>繰返し曜日</Label>
                <div className="flex gap-1 mt-1">
                  {dayLabels.map((day, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant={formDays.includes(idx) ? "default" : "outline"}
                      className="w-9 h-9 p-0"
                      onClick={() =>
                        setFormDays((prev) =>
                          prev.includes(idx)
                            ? prev.filter((d) => d !== idx)
                            : [...prev, idx].sort()
                        )
                      }
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={editTemplate ? handleUpdate : handleCreate}
              className="w-full"
              disabled={!formName || !formTitle}
            >
              {editTemplate ? "更新" : "作成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Shift from Template Dialog */}
      <Dialog
        open={!!showFromTemplate}
        onOpenChange={() => {
          setShowFromTemplate(null);
          setShiftDate("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートからシフト作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>シフト日</Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <Button
              onClick={handleCreateFromTemplate}
              className="w-full"
              disabled={!shiftDate}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              シフトを作成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
