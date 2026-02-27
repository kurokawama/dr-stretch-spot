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
  application_received: "応募受信",
  application_confirmed: "応募承認",
  application_rejected: "応募却下",
  application_cancelled: "応募キャンセル",
  shift_published: "シフト公開",
  shift_approval_request: "シフト承認依頼",
  shift_approved: "シフト承認済",
  cost_alert: "コストアラート",
  emergency_auto_trigger: "緊急自動トリガー",
  blank_alert: "ブランクアラート",
};

export default function StoreNotificationsPage() {
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
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知</h1>
          <p className="text-sm text-muted-foreground mt-1">
            シフト応募・承認状況の通知を確認
          </p>
        </div>
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

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              読み込み中...
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              通知はありません
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    notif.read_at
                      ? "bg-muted/30"
                      : "bg-primary/5 hover:bg-primary/10"
                  }`}
                  onClick={() => !notif.read_at && handleMarkRead(notif.id)}
                >
                  <div className="mt-1">
                    {notif.read_at ? (
                      <Circle className="h-2 w-2 text-muted-foreground" />
                    ) : (
                      <Circle className="h-2 w-2 fill-primary text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={`text-sm font-medium truncate ${
                          notif.read_at ? "text-muted-foreground" : ""
                        }`}
                      >
                        {notif.title}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {categoryLabels[notif.category] ?? notif.category}
                      </Badge>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground truncate">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
