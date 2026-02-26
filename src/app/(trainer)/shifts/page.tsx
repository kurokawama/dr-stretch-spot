"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Clock, Zap } from "lucide-react";
import { searchShifts } from "@/actions/shifts";
import type { ShiftRequest } from "@/types/database";

const AREAS = [
  "すべて", "北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州・沖縄",
];

export default function ShiftSearchPage() {
  const [shifts, setShifts] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    area: "",
    date_from: "",
    date_to: "",
    is_emergency: false,
  });

  const fetchShifts = async () => {
    setLoading(true);
    const result = await searchShifts({
      area: filters.area && filters.area !== "すべて" ? filters.area : undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      is_emergency: filters.is_emergency || undefined,
    });
    if (result.success && result.data) {
      setShifts(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShifts();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-heading text-2xl font-bold">シフト検索</h1>

      <form onSubmit={handleSearch} className="space-y-3 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">エリア</Label>
            <Select
              value={filters.area}
              onValueChange={(v) => setFilters({ ...filters, area: v })}
            >
              <SelectTrigger><SelectValue placeholder="エリア" /></SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">開始日</Label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">終了日</Label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={filters.is_emergency}
              onCheckedChange={(v) => setFilters({ ...filters, is_emergency: v })}
            />
            <Label className="text-sm flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              緊急シフトのみ
            </Label>
          </div>
          <Button type="submit" size="sm">
            <Search className="mr-1 h-4 w-4" />
            検索
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">読み込み中...</p>
      ) : shifts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">条件に合うシフトがありません</p>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <Link key={shift.id} href={`/shifts/${shift.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{shift.title}</h3>
                        {shift.is_emergency && (
                          <Badge variant="destructive" className="text-xs">
                            <Zap className="mr-0.5 h-3 w-3" />
                            緊急
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {(shift.store as unknown as { name: string; area: string })?.name} ({(shift.store as unknown as { area: string })?.area})
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {shift.shift_date} {shift.start_time}〜{shift.end_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {shift.filled_count}/{shift.required_count}名
                      </p>
                      {shift.is_emergency && shift.emergency_bonus_amount > 0 && (
                        <p className="text-xs text-amber-600">
                          +¥{shift.emergency_bonus_amount} 緊急手当
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
