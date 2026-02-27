"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  ShiftApplication,
  ShiftRequest,
  AttendanceRecord,
} from "@/types/database";

/**
 * Get all matchings (HR/admin view) with filters
 */
export async function getAllMatchings(filters?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  store_id?: string;
  area?: string;
}): Promise<ActionResult<ShiftApplication[]>> {
  const admin = createAdminClient();

  let query = admin
    .from("shift_applications")
    .select(
      "*, shift_request:shift_requests(*, store:stores(name, area, prefecture)), trainer:alumni_trainers(full_name, email, phone)"
    )
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.date_from) {
    query = query.gte("shift_request.shift_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("shift_request.shift_date", filters.date_to);
  }

  const { data, error } = await query;

  if (error) return { success: false, error: error.message };

  // Filter by store_id or area if needed (post-filter due to join)
  let filtered = data ?? [];
  if (filters?.store_id) {
    filtered = filtered.filter(
      (m) => m.shift_request?.store_id === filters.store_id
    );
  }
  if (filters?.area) {
    filtered = filtered.filter(
      (m) => m.shift_request?.store?.area === filters.area
    );
  }

  return { success: true, data: filtered };
}

/**
 * HR cancels a matching
 */
export async function hrCancelMatching(
  applicationId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "この操作を行う権限がありません" };
  }

  const admin = createAdminClient();

  // Get application to decrement filled_count
  const { data: application } = await admin
    .from("shift_applications")
    .select("shift_request_id, status")
    .eq("id", applicationId)
    .single();

  if (!application) return { success: false, error: "応募情報が見つかりません" };

  const { error } = await admin
    .from("shift_applications")
    .update({
      status: "cancelled",
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { success: false, error: error.message };

  // If was approved, decrement filled_count and re-open shift
  if (application.status === "approved") {
    await admin.rpc("decrement_filled_count", {
      shift_id: application.shift_request_id,
    });

    // Delete associated attendance record
    await admin
      .from("attendance_records")
      .delete()
      .eq("application_id", applicationId)
      .eq("status", "scheduled");
  }

  return { success: true };
}

/**
 * Get tomorrow's scheduled attendances for all stores or filtered by area
 */
export async function getTomorrowAttendances(
  area?: string
): Promise<ActionResult<AttendanceRecord[]>> {
  const admin = createAdminClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  let query = admin
    .from("attendance_records")
    .select(
      "*, trainer:alumni_trainers(full_name, email, phone), store:stores(name, area), application:shift_applications(pre_day_confirmed, pre_day_reminder_sent)"
    )
    .eq("shift_date", tomorrowStr)
    .order("scheduled_start");

  const { data, error } = await query;

  if (error) return { success: false, error: error.message };

  let filtered = data ?? [];
  if (area) {
    filtered = filtered.filter((r) => r.store?.area === area);
  }

  return { success: true, data: filtered };
}

/**
 * Get today's attendances with real-time status
 */
export async function getTodayAllAttendances(
  area?: string
): Promise<ActionResult<AttendanceRecord[]>> {
  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await admin
    .from("attendance_records")
    .select(
      "*, trainer:alumni_trainers(full_name, email, phone), store:stores(name, area), application:shift_applications(status, confirmed_rate)"
    )
    .eq("shift_date", today)
    .order("scheduled_start");

  if (error) return { success: false, error: error.message };

  let filtered = data ?? [];
  if (area) {
    filtered = filtered.filter((r) => r.store?.area === area);
  }

  return { success: true, data: filtered };
}

/**
 * Get all shift requests with approval status for HR dashboard
 */
export async function getAllShiftRequests(filters?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  area?: string;
}): Promise<ActionResult<ShiftRequest[]>> {
  const admin = createAdminClient();

  let query = admin
    .from("shift_requests")
    .select("*, store:stores(name, area, prefecture)")
    .order("shift_date", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.date_from) {
    query = query.gte("shift_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("shift_date", filters.date_to);
  }

  const { data, error } = await query;

  if (error) return { success: false, error: error.message };

  let filtered = data ?? [];
  if (filters?.area) {
    filtered = filtered.filter((s) => s.store?.area === filters.area);
  }

  return { success: true, data: filtered };
}

/**
 * Confirm pre-day attendance (trainer confirms they will attend)
 */
export async function confirmPreDayAttendance(
  applicationId: string
): Promise<ActionResult> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("shift_applications")
    .update({
      pre_day_confirmed: true,
      pre_day_confirmed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Request clock-out for a trainer (store initiates)
 */
export async function requestClockOut(
  applicationId: string
): Promise<ActionResult> {
  // This generates a clock_out QR token that appears on the trainer's screen
  const { generateQrToken } = await import("./qr");
  const result = await generateQrToken(applicationId, "clock_out");
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}
