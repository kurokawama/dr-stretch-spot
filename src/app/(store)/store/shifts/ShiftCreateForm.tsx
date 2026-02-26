"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createShiftRequest } from "@/actions/shifts";
import { toast } from "sonner";

interface ShiftCreateFormProps {
  storeId: string;
}

export function ShiftCreateForm({ storeId }: ShiftCreateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const result = await createShiftRequest({
      store_id: storeId,
      title: form.get("title") as string,
      description: (form.get("description") as string) || undefined,
      shift_date: form.get("shift_date") as string,
      start_time: form.get("start_time") as string,
      end_time: form.get("end_time") as string,
      break_minutes: Number(form.get("break_minutes")) || 0,
      required_count: Number(form.get("required_count")) || 1,
      is_emergency: isEmergency,
      emergency_bonus_amount: isEmergency
        ? Number(form.get("emergency_bonus")) || 0
        : undefined,
    });

    setLoading(false);

    if (result.success) {
      toast.success("シフト募集を作成しました");
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setIsEmergency(false);
    } else {
      toast.error(result.error ?? "作成に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">新規シフト募集</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                name="title"
                placeholder="例: 午前シフト"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift_date">日付</Label>
              <Input id="shift_date" name="shift_date" type="date" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start_time">開始時間</Label>
              <Input id="start_time" name="start_time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">終了時間</Label>
              <Input id="end_time" name="end_time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break_minutes">休憩（分）</Label>
              <Input
                id="break_minutes"
                name="break_minutes"
                type="number"
                defaultValue={60}
                min={0}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="required_count">必要人数</Label>
              <Input
                id="required_count"
                name="required_count"
                type="number"
                defaultValue={1}
                min={1}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">備考</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="特記事項があれば入力"
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="is_emergency"
              checked={isEmergency}
              onCheckedChange={setIsEmergency}
            />
            <Label htmlFor="is_emergency" className="cursor-pointer">
              緊急募集（追加手当あり）
            </Label>
            {isEmergency && (
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="emergency_bonus" className="text-sm shrink-0">
                  追加手当
                </Label>
                <Input
                  id="emergency_bonus"
                  name="emergency_bonus"
                  type="number"
                  className="w-28"
                  placeholder="500"
                  min={0}
                  step={100}
                />
                <span className="text-sm text-muted-foreground">円/h</span>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "作成中..." : "シフト募集を作成"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
