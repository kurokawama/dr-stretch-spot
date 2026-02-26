"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyApplications, cancelApplication } from "@/actions/applications";
import type { ShiftApplication } from "@/types/database";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "審査中", approved: "承認済", rejected: "不承認",
  cancelled: "キャンセル", completed: "完了", no_show: "欠勤",
};
const statusVariants: Record<string, "outline" | "default" | "destructive" | "secondary"> = {
  pending: "outline", approved: "default", rejected: "destructive",
  cancelled: "secondary", completed: "secondary", no_show: "destructive",
};

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
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm">{sr?.title ?? "シフト"}</p>
              <p className="text-xs text-muted-foreground">{sr?.store?.name}</p>
              <p className="text-xs text-muted-foreground">
                {sr?.shift_date} {sr?.start_time}〜{sr?.end_time}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge variant={statusVariants[app.status] ?? "outline"}>
                {statusLabels[app.status] ?? app.status}
              </Badge>
              <p className="text-sm font-medium">¥{app.confirmed_rate}/h</p>
            </div>
          </div>
          {(app.status === "pending" || app.status === "approved") && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => handleCancel(app.id)}
            >
              キャンセル
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-heading text-2xl font-bold">マイシフト</h1>
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">予定 ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="flex-1">履歴 ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1">取消 ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-3">
          {upcoming.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">予定のシフトはありません</p>
          ) : upcoming.map((a) => <AppCard key={a.id} app={a} />)}
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-3">
          {past.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">履歴はありません</p>
          ) : past.map((a) => <AppCard key={a.id} app={a} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="space-y-3 mt-3">
          {cancelled.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">取消履歴はありません</p>
          ) : cancelled.map((a) => <AppCard key={a.id} app={a} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
