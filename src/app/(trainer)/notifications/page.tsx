"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import type { NotificationCategory, NotificationLog } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

type FilterCategory =
  | "all"
  | "shift_published"
  | "application_confirmed"
  | "application_rejected"
  | "blank_alert"
  | "pre_day_reminder";

const FILTER_OPTIONS: Array<{ value: FilterCategory; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "shift_published", label: "シフト公開" },
  { value: "application_confirmed", label: "応募確定" },
  { value: "application_rejected", label: "応募不採用" },
  { value: "blank_alert", label: "ブランク通知" },
  { value: "pre_day_reminder", label: "前日リマインド" },
];

const CATEGORY_LABELS: Partial<Record<NotificationCategory, string>> = {
  shift_published: "シフト公開",
  application_confirmed: "応募確定",
  application_rejected: "応募不採用",
  blank_alert: "ブランク通知",
  pre_day_reminder: "前日リマインド",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ja-JP");
}

function getCategoryLabel(category: NotificationCategory) {
  return CATEGORY_LABELS[category] ?? category;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        setLoading(false);
        return;
      }

      setUserId(user.id);
    }

    void loadUser();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    async function loadNotifications() {
      setLoading(true);

      const filters: {
        category?: NotificationCategory;
        limit: number;
      } = { limit: 100 };

      if (filterCategory !== "all") {
        filters.category = filterCategory;
      }

      const result = await getNotifications(userId, filters);

      if (result.success && result.data) {
        setNotifications(result.data);
      } else {
        setNotifications([]);
      }

      setLoading(false);
    }

    void loadNotifications();
  }, [userId, filterCategory]);

  const unreadCount = notifications.filter((item) => item.read_at === null).length;

  const handleMarkRead = async (
    notificationId: string,
    isAlreadyRead: boolean
  ) => {
    if (isAlreadyRead) return;

    setMarkingId(notificationId);
    const result = await markNotificationRead(notificationId);

    if (result.success) {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, read_at: now } : item
        )
      );
    } else {
      toast.error("既読更新に失敗しました");
    }

    setMarkingId(null);
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;

    setMarkingAll(true);
    const result = await markAllNotificationsRead(userId);

    if (result.success) {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, read_at: item.read_at ?? now }))
      );
      toast.success("すべて既読にしました");
    } else {
      toast.error("既読更新に失敗しました");
    }

    setMarkingAll(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">通知</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck className="mr-1.5 h-4 w-4" />
          すべて既読
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Select
              value={filterCategory}
              onValueChange={(value) => setFilterCategory(value as FilterCategory)}
            >
              <SelectTrigger className="w-[210px]">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{unreadCount}件未読</Badge>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            未読の通知カードをタップすると既読になります。
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={`loading-${index}`} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="h-12 rounded-md bg-muted/60 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">通知はありません</p>
              <p className="text-sm text-muted-foreground/70">
                新しいお知らせが届くとここに表示されます
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 stagger-children">
          {notifications.map((notification) => {
            const isUnread = notification.read_at === null;

            return (
              <button
                key={notification.id}
                type="button"
                className="w-full text-left card-interactive disabled:cursor-default"
                disabled={!isUnread || markingId === notification.id}
                onClick={() => handleMarkRead(notification.id, !isUnread)}
              >
                <Card
                  className={`border-0 shadow-sm ${isUnread ? "ring-1 ring-primary/20" : ""}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`mt-1 block h-2.5 w-2.5 rounded-full ${isUnread ? "bg-primary" : "bg-muted-foreground/30"}`}
                        />
                        <p className="text-sm font-medium">
                          {notification.title?.trim() || "通知"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {getCategoryLabel(notification.category)}
                      </Badge>
                    </div>

                    {notification.body && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {notification.body}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </p>
                      <Badge variant={isUnread ? "default" : "secondary"}>
                        {isUnread ? "未読" : "既読"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
