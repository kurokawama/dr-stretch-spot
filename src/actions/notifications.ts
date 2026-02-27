"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  NotificationLog,
  NotificationType,
  NotificationCategory,
} from "@/types/database";

// =============================================
// Get Notifications (T-14, S-9)
// =============================================

export async function getNotifications(
  userId: string,
  filters?: {
    category?: NotificationCategory;
    unread_only?: boolean;
    limit?: number;
  }
): Promise<ActionResult<NotificationLog[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();
  let query = admin
    .from("notification_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.unread_only) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

// =============================================
// Get Unread Count
// =============================================

export async function getUnreadNotificationCount(
  userId: string
): Promise<ActionResult<number>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { count, error } = await admin
    .from("notification_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };
  return { success: true, data: count ?? 0 };
}

// =============================================
// Mark Notification Read
// =============================================

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("notification_logs")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =============================================
// Mark All Notifications Read
// =============================================

export async function markAllNotificationsRead(
  userId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("notification_logs")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =============================================
// Create Notification (Internal API)
// =============================================

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body?: string;
  matchingId?: string;
  shiftRequestId?: string;
}): Promise<ActionResult<NotificationLog>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notification_logs")
    .insert({
      user_id: params.userId,
      type: params.type,
      category: params.category,
      title: params.title,
      subject: params.title,
      body: params.body || null,
      matching_id: params.matchingId || null,
      shift_request_id: params.shiftRequestId || null,
      sent_at: new Date().toISOString(),
      delivered: true,
      responded: false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// =============================================
// Batch Create Notifications (for multiple users)
// =============================================

export async function createBatchNotifications(
  userIds: string[],
  notification: {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    body?: string;
    shiftRequestId?: string;
  }
): Promise<ActionResult<{ count: number }>> {
  if (userIds.length === 0) return { success: true, data: { count: 0 } };

  const admin = createAdminClient();

  const records = userIds.map((userId) => ({
    user_id: userId,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    subject: notification.title,
    body: notification.body || null,
    shift_request_id: notification.shiftRequestId || null,
    sent_at: new Date().toISOString(),
    delivered: true,
    responded: false,
  }));

  const { error } = await admin.from("notification_logs").insert(records);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: userIds.length } };
}
