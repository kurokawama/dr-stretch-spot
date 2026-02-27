"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Clock, Zap, CalendarSearch } from "lucide-react";
import { searchShifts } from "@/actions/shifts";
import type { ShiftRequest } from "@/types/database";

const AREAS = [
  "すべて", "北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州・沖縄",
];

function ShiftCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

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
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">シフト検索</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">エリア</Label>
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
                <Label className="text-xs font-medium">開始日</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">終了日</Label>
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
              <Button type="submit" size="sm" className="px-4">
                <Search className="mr-1.5 h-4 w-4" />
                検索
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </div>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="rounded-full bg-muted p-4">
            <CalendarSearch className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-muted-foreground">シフトが見つかりません</p>
            <p className="text-sm text-muted-foreground/70">
              フィルター条件を変えて検索してみましょう
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {shifts.map((shift) => (
            <Link key={shift.id} href={`/shifts/${shift.id}`} className="block card-interactive">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{shift.title}</h3>
                        {shift.is_emergency && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                            <Zap className="mr-0.5 h-3 w-3" />
                            緊急
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {(shift.store as unknown as { name: string; area: string })?.name} ({(shift.store as unknown as { area: string })?.area})
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {shift.shift_date} {shift.start_time}〜{shift.end_time}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="outline" className="text-xs">
                        {shift.filled_count}/{shift.required_count}名
                      </Badge>
                      {shift.is_emergency && shift.emergency_bonus_amount > 0 && (
                        <p className="text-xs font-semibold text-amber-600">
                          +¥{shift.emergency_bonus_amount}
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
