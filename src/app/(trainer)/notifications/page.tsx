"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Circle } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import type { NotificationLog } from "@/types/database";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  shift_published: "新着シフト",
  application_confirmed: "応募承認",
  application_rejected: "応募見送り",
  application_cancelled: "応募キャンセル",
  pre_day_reminder: "前日リマインド",
  day_reminder: "当日リマインド",
  clock_in: "出勤確認",
  clock_out: "退勤確認",
  blank_alert: "ブランクアラート",
  rank_update: "ランク更新",
  skill_check_scheduled: "スキルチェック予定",
};

export default function TrainerNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    setLoading(true);
    const result = await getNotifications(user.id, { limit: 100 });
    if (result.success && result.data) {
      setNotifications(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkRead = async (id: string) => {
    const result = await markNotificationRead(id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    const result = await markAllNotificationsRead(userId);
    if (result.success) {
      toast.success("全て既読にしました");
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        }))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Group notifications by date
  const grouped: Record<string, NotificationLog[]> = {};
  notifications.forEach((n) => {
    const dateKey = new Date(n.created_at).toLocaleDateString("ja-JP");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(n);
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">通知</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            全て既読
          </Button>
        )}
      </div>

      {unreadCount > 0 && (
        <Badge variant="destructive" className="text-sm px-3 py-1">
          未読 {unreadCount}件
        </Badge>
      )}

      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            読み込み中...
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">通知はありません</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">
              {date}
            </p>
            {items.map((notif) => (
              <Card
                key={notif.id}
                className={`border-0 shadow-sm cursor-pointer transition-colors ${
                  notif.read_at ? "opacity-70" : "ring-1 ring-primary/20"
                }`}
                onClick={() => !notif.read_at && handleMarkRead(notif.id)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="mt-0.5">
                    {notif.read_at ? (
                      <Circle className="h-2 w-2 text-muted-foreground" />
                    ) : (
                      <Circle className="h-2 w-2 fill-primary text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">
                        {notif.title}
                      </p>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground">
                        {notif.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[notif.category] ?? notif.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notif.created_at).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
