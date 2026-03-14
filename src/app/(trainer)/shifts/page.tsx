"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
import { Search, MapPin, Clock, Zap, CalendarSearch, SlidersHorizontal } from "lucide-react";
import { searchShifts } from "@/actions/shifts";
import type { ShiftRequest } from "@/types/database";

const AREAS = [
  "すべて", "北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州・沖縄",
];

const statusBadgeStyles: Record<string, string> = {
  open: "bg-primary/10 text-primary border-primary/30",
  closed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  pending_approval: "bg-accent/30 text-accent-foreground border-accent/60",
};

const FILTER_CHIPS = [
  { label: "今週", group: "period" },
  { label: "来週", group: "period" },
  { label: "関東", group: "area" },
  { label: "関西", group: "area" },
  { label: "午前", group: "time" },
  { label: "午後", group: "time" },
  { label: "高時給", group: "rate" },
] as const;

type ChipGroup = (typeof FILTER_CHIPS)[number]["group"];

function ShiftCardSkeleton() {
  return (
    <Card className="rounded-lg border bg-card shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40 shimmer" />
            <Skeleton className="h-4 w-32 shimmer" />
            <Skeleton className="h-4 w-44 shimmer" />
          </div>
          <Skeleton className="h-5 w-12 shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ShiftSearchPage() {
  const [shifts, setShifts] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    area: "",
    date_from: "",
    date_to: "",
    is_emergency: false,
  });

  const getDateRangeFromChip = () => {
    const now = new Date();
    const thisWeek = activeChips.includes("今週");
    const nextWeek = activeChips.includes("来週");
    if (!thisWeek && !nextWeek) {
      return { from: filters.date_from || undefined, to: filters.date_to || undefined };
    }

    const start = new Date(now);
    const startOffset = thisWeek ? 0 : 7;
    start.setDate(now.getDate() + startOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    return {
      from: formatDate(start),
      to: formatDate(end),
    };
  };

  const fetchShifts = async () => {
    setLoading(true);
    const dateRange = getDateRangeFromChip();
    const chipArea = activeChips.find((chip) => chip === "関東" || chip === "関西");
    const result = await searchShifts({
      area: chipArea ?? (filters.area && filters.area !== "すべて" ? filters.area : undefined),
      date_from: dateRange.from,
      date_to: dateRange.to,
      is_emergency: filters.is_emergency || undefined,
    });
    if (result.success && result.data) {
      setShifts(result.data);
    }
    setLoading(false);
  };

  const resetFilters = async () => {
    setLoading(true);
    setActiveChips([]);
    setFilters({ area: "", date_from: "", date_to: "", is_emergency: false });
    const result = await searchShifts({});
    if (result.success && result.data) {
      setShifts(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChips]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShifts();
  };

  const handleChipToggle = (label: string, group: ChipGroup) => {
    setActiveChips((prev) => {
      const isActive = prev.includes(label);
      const withoutGroup = prev.filter((chip) => {
        const chipMeta = FILTER_CHIPS.find((item) => item.label === chip);
        return chipMeta?.group !== group;
      });

      if (isActive) {
        return withoutGroup;
      }

      return [...withoutGroup, label];
    });
  };

  const displayedShifts = shifts.filter((shift) => {
    if (activeChips.includes("午前") && shift.start_time >= "12:00") return false;
    if (activeChips.includes("午後") && shift.start_time < "12:00") return false;
    if (activeChips.includes("高時給") && shift.emergency_bonus_amount <= 0) return false;
    return true;
  });

  return (
    <div className="animate-fade-in-up mx-auto max-w-lg space-y-4 bg-background p-4 pb-24 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">シフト検索</h1>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border bg-white"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_CHIPS.map((chip) => {
          const active = activeChips.includes(chip.label);
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipToggle(chip.label, chip.group)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-100"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {showAdvanced && (
        <Card className="rounded-lg border bg-card shadow-sm">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">エリア</Label>
                  <Select
                    value={filters.area}
                    onValueChange={(v) => setFilters({ ...filters, area: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="エリア" /></SelectTrigger>
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
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">終了日</Label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={filters.is_emergency}
                    onCheckedChange={(v) => setFilters({ ...filters, is_emergency: v })}
                  />
                  <Label className="flex items-center gap-1 text-sm">
                    <Zap className="h-3 w-3 text-accent-foreground" />
                    緊急シフトのみ
                  </Label>
                </div>
                <Button type="submit" size="sm" className="rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                  <Search className="mr-1.5 h-4 w-4" />
                  検索
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{displayedShifts.length}件の募集</p>
        {activeChips.includes("高時給") && (
          <p className="text-xs text-muted-foreground">緊急手当付きシフト</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </div>
      ) : displayedShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed bg-muted/30 py-16">
          <div className="rounded-full bg-muted p-4">
            <CalendarSearch className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-medium text-muted-foreground">条件に合うシフトが見つかりません</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={resetFilters}
          >
            フィルターを変更
          </Button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {displayedShifts.map((shift, index) => (
            <Link key={shift.id} href={`/shifts/${shift.id}`} className="block card-interactive">
              <Card
                className={cn(
                  "rounded-lg border shadow-sm",
                  index % 2 === 0 ? "bg-white" : "bg-muted/30",
                  shift.is_emergency && "border-l-4 border-red-500"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{shift.title}</h3>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusBadgeStyles[shift.status] ?? "bg-muted text-muted-foreground border-border"}`}
                        >
                          {shift.status}
                        </Badge>
                        {shift.is_emergency && (
                          <Badge className="border-red-200 bg-red-100 text-xs text-red-700">
                            <Zap className="mr-0.5 h-3 w-3" />
                            緊急
                          </Badge>
                        )}
                      </div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {(shift.store as unknown as { name: string; area: string })?.name} ({(shift.store as unknown as { area: string })?.area})
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {shift.shift_date} {shift.start_time}〜{shift.end_time}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-bold text-primary">+¥{(shift.emergency_bonus_amount ?? 0).toLocaleString("ja-JP")}</p>
                      <Badge variant="outline" className="text-xs">
                        {shift.filled_count}/{shift.required_count}名
                      </Badge>
                      <span className="inline-flex h-8 items-center rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground">
                        応募する
                      </span>
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
