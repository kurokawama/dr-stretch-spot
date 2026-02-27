"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyApplications, cancelApplication } from "@/actions/applications";
import type { ShiftApplication } from "@/types/database";
import { toast } from "sonner";
import { CalendarOff, History, XCircle, MapPin, Clock } from "lucide-react";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  pending: "審査中", approved: "承認済", rejected: "不承認",
  cancelled: "キャンセル", completed: "完了", no_show: "欠勤",
};
const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  no_show: "bg-red-100 text-red-800 border-red-200",
};

function ShiftSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-5 w-16 ml-auto" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70">{description}</p>
    </div>
  );
}

export default function MyShiftsPage() {
  const [apps, setApps] = useState<ShiftApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getMyApplications();
      if (result.success && result.data) setApps(result.data);
      setLoading(false);
    }
    load();
  }, []);

  const upcoming = apps.filter((a) => ["pending", "approved"].includes(a.status));
  const past = apps.filter((a) => ["completed", "no_show"].includes(a.status));
  const cancelled = apps.filter((a) => ["cancelled", "rejected"].includes(a.status));

  const handleCancel = async (appId: string) => {
    const result = await cancelApplication(appId, "トレーナーによるキャンセル");
    if (result.success) {
      toast.success("キャンセルしました");
      const refreshed = await getMyApplications();
      if (refreshed.success && refreshed.data) setApps(refreshed.data);
    } else {
      toast.error(result.error || "キャンセルに失敗しました");
    }
  };

  const AppCard = ({ app }: { app: ShiftApplication }) => {
    const sr = app.shift_request as unknown as { title: string; shift_date: string; start_time: string; end_time: string; store: { name: string } } | undefined;
    return (
      <Card className="border-0 shadow-sm card-interactive">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="font-medium">{sr?.title ?? "シフト"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {sr?.store?.name}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {sr?.shift_date} {sr?.start_time}〜{sr?.end_time}
              </p>
            </div>
            <div className="text-right space-y-1.5">
              <Badge variant="outline" className={statusColors[app.status] ?? ""}>
                {statusLabels[app.status] ?? app.status}
              </Badge>
              <p className="text-sm font-mono font-semibold">¥{app.confirmed_rate}/h</p>
            </div>
          </div>
          {(app.status === "pending" || app.status === "approved") && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full text-muted-foreground hover:text-destructive hover:border-destructive"
              onClick={() => handleCancel(app.id)}
            >
              キャンセル
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto">
        <h1 className="font-heading text-2xl font-bold">マイシフト</h1>
        <div className="space-y-3">
          <ShiftSkeleton />
          <ShiftSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">マイシフト</h1>
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">予定 ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="flex-1">履歴 ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1">取消 ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-3 stagger-children">
          {upcoming.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={CalendarOff}
                title="予定のシフトはありません"
                description="シフト検索から新しいシフトを探してみましょう"
              />
              <Button asChild variant="outline" className="w-full">
                <Link href="/shifts">シフトを探す</Link>
              </Button>
            </div>
          ) : upcoming.map((a) => <AppCard key={a.id} app={a} />)}
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-3 stagger-children">
          {past.length === 0 ? (
            <EmptyState icon={History} title="履歴はありません" description="シフト完了後にここに表示されます" />
          ) : past.map((a) => <AppCard key={a.id} app={a} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="space-y-3 mt-3 stagger-children">
          {cancelled.length === 0 ? (
            <EmptyState icon={XCircle} title="取消履歴はありません" description="キャンセルされたシフトはここに表示されます" />
          ) : cancelled.map((a) => <AppCard key={a.id} app={a} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
