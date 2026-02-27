"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, QrToken } from "@/types/database";
import { randomUUID } from "crypto";

const QR_EXPIRY_MINUTES = 15;

/**
 * Generate a QR token for clock-in or clock-out
 */
export async function generateQrToken(
  applicationId: string,
  type: "clock_in" | "clock_out"
): Promise<ActionResult<QrToken>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify the application exists and is approved
  const admin = createAdminClient();
  const { data: application } = await admin
    .from("shift_applications")
    .select("id, trainer_id, status, shift_request:shift_requests(shift_date, store_id)")
    .eq("id", applicationId)
    .single();

  if (!application) return { success: false, error: "Application not found" };
  if (application.status !== "approved" && application.status !== "completed") {
    return { success: false, error: "Application is not confirmed" };
  }

  // Invalidate any existing unused tokens of the same type
  await admin
    .from("qr_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("matching_id", applicationId)
    .eq("type", type)
    .is("used_at", null);

  // Create new token
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000);

  const { data, error } = await admin
    .from("qr_tokens")
    .insert({
      matching_id: applicationId,
      type,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/**
 * Verify a QR token and perform clock-in/clock-out
 */
export async function verifyQrToken(
  token: string
): Promise<ActionResult<{ type: "clock_in" | "clock_out"; applicationId: string }>> {
  const admin = createAdminClient();

  // Find the token
  const { data: qrToken } = await admin
    .from("qr_tokens")
    .select("*, application:shift_applications(id, trainer_id, status, shift_request:shift_requests(store_id, shift_date, start_time, end_time, break_minutes))")
    .eq("token", token)
    .single();

  if (!qrToken) return { success: false, error: "Invalid QR code" };
  if (qrToken.used_at) return { success: false, error: "QR code already used" };
  if (new Date(qrToken.expires_at) < new Date()) {
    return { success: false, error: "QR code expired" };
  }

  // Mark token as used
  await admin
    .from("qr_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", qrToken.id);

  const app = qrToken.application;
  if (!app) return { success: false, error: "Application not found" };

  const shift = app.shift_request;

  if (qrToken.type === "clock_in") {
    // Get or create attendance record
    const { data: existing } = await admin
      .from("attendance_records")
      .select("id")
      .eq("application_id", app.id)
      .single();

    if (existing) {
      // Update existing
      await admin
        .from("attendance_records")
        .update({
          clock_in_at: new Date().toISOString(),
          status: "clocked_in",
        })
        .eq("id", existing.id);
    } else if (shift) {
      // Create new
      await admin.from("attendance_records").insert({
        application_id: app.id,
        trainer_id: app.trainer_id,
        store_id: shift.store_id,
        shift_date: shift.shift_date,
        scheduled_start: shift.start_time,
        scheduled_end: shift.end_time,
        break_minutes: shift.break_minutes ?? 0,
        clock_in_at: new Date().toISOString(),
        status: "clocked_in",
      });
    }
  } else if (qrToken.type === "clock_out") {
    // Clock out
    const { data: record } = await admin
      .from("attendance_records")
      .select("id, clock_in_at, break_minutes")
      .eq("application_id", app.id)
      .single();

    if (!record) return { success: false, error: "No clock-in record found" };
    if (!record.clock_in_at) return { success: false, error: "Not clocked in yet" };

    const clockOutTime = new Date();
    const clockInTime = new Date(record.clock_in_at);
    const totalMinutes = Math.round(
      (clockOutTime.getTime() - clockInTime.getTime()) / 60000
    );
    const actualWorkMinutes = Math.max(
      0,
      totalMinutes - (record.break_minutes ?? 0)
    );

    await admin
      .from("attendance_records")
      .update({
        clock_out_at: clockOutTime.toISOString(),
        actual_work_minutes: actualWorkMinutes,
        status: "clocked_out",
      })
      .eq("id", record.id);

    // Update trainer's last_shift_date and blank_status
    await admin
      .from("alumni_trainers")
      .update({
        last_shift_date: shift?.shift_date ?? new Date().toISOString().split("T")[0],
        blank_status: "ok",
      })
      .eq("id", app.trainer_id);

    // Mark application as completed
    await admin
      .from("shift_applications")
      .update({ status: "completed" })
      .eq("id", app.id);
  }

  return {
    success: true,
    data: { type: qrToken.type as "clock_in" | "clock_out", applicationId: app.id },
  };
}

/**
 * Get active QR token for a matching (trainer's view)
 */
export async function getActiveQrToken(
  applicationId: string,
  type: "clock_in" | "clock_out"
): Promise<ActionResult<QrToken | null>> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("qr_tokens")
    .select("*")
    .eq("matching_id", applicationId)
    .eq("type", type)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { success: true, data: data ?? null };
}
