"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateHourlyRate } from "./pricing";
import { createNotification } from "@/actions/notifications";
import type { ActionResult, ShiftApplication } from "@/types/database";

export async function applyToShift(
  shiftRequestId: string
): Promise<ActionResult<ShiftApplication>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get trainer record
  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id, status, blank_status, tenure_years")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "Trainer record not found" };
  if (trainer.status !== "active") {
    return { success: false, error: "Account is not active" };
  }

  // Check blank status
  if (
    trainer.blank_status === "skill_check_required" ||
    trainer.blank_status === "training_required"
  ) {
    return {
      success: false,
      error: `Applications blocked: ${trainer.blank_status}. Please complete the required check/training.`,
    };
  }

  // Check tenure minimum (2 years)
  if (trainer.tenure_years < 2) {
    return {
      success: false,
      error: "Minimum 2 years of tenure required to apply",
    };
  }

  // Check shift is still open
  const { data: shift } = await supabase
    .from("shift_requests")
    .select("status, filled_count, required_count, store_id, shift_date, start_time, end_time, break_minutes")
    .eq("id", shiftRequestId)
    .single();

  if (!shift) return { success: false, error: "Shift not found" };
  if (shift.status !== "open") {
    return { success: false, error: "Shift is no longer open" };
  }
  if (shift.filled_count >= shift.required_count) {
    return { success: false, error: "Shift is fully booked" };
  }

  // Check duplicate application
  const { data: existing } = await supabase
    .from("shift_applications")
    .select("id")
    .eq("shift_request_id", shiftRequestId)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Already applied to this shift" };
  }

  // Calculate rate (FIXED at application time)
  const rateBreakdown = await calculateHourlyRate(trainer.id, shiftRequestId);

  // Check if store has auto_confirm enabled
  const { data: store } = await supabase
    .from("stores")
    .select("auto_confirm")
    .eq("id", shift.store_id)
    .single();

  const autoConfirm = store?.auto_confirm ?? true;
  const applicationStatus = autoConfirm ? "approved" : "pending";

  // Create application
  const { data, error } = await supabase
    .from("shift_applications")
    .insert({
      shift_request_id: shiftRequestId,
      trainer_id: trainer.id,
      confirmed_rate: rateBreakdown.total,
      rate_breakdown: rateBreakdown,
      status: applicationStatus,
      reviewed_at: autoConfirm ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // If auto-confirmed, increment filled_count and create attendance record
  if (autoConfirm && data) {
    await supabase.rpc("increment_filled_count", {
      shift_id: shiftRequestId,
    });

    if (shift) {
      await supabase.from("attendance_records").insert({
        application_id: data.id,
        trainer_id: trainer.id,
        store_id: shift.store_id,
        shift_date: shift.shift_date,
        scheduled_start: shift.start_time,
        scheduled_end: shift.end_time,
        break_minutes: shift.break_minutes ?? 0,
        status: "scheduled",
      });
    }
  }

  // Phase 2: Notify store manager(s) about new application
  if (data) {
    const admin = createAdminClient();
    const { data: storeManagers } = await admin
      .from("store_managers")
      .select("auth_user_id")
      .eq("store_id", shift.store_id)
      .eq("status", "active");

    if (storeManagers && storeManagers.length > 0) {
      const { data: trainerInfo } = await admin
        .from("alumni_trainers")
        .select("full_name")
        .eq("id", trainer.id)
        .single();

      for (const mgr of storeManagers) {
        await createNotification({
          userId: mgr.auth_user_id,
          type: "push",
          category: "application_received",
          title: `新規応募: ${trainerInfo?.full_name ?? "トレーナー"}`,
          body: autoConfirm
            ? "自動承認で確定しました"
            : "応募を確認してください",
          shiftRequestId,
        });
      }
    }
  }

  return { success: true, data };
}

export async function approveApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get manager record
  const { data: manager } = await supabase
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) return { success: false, error: "Not a store manager" };

  // Get application with shift info
  const { data: application } = await supabase
    .from("shift_applications")
    .select("*, shift_request:shift_requests(required_count, filled_count)")
    .eq("id", applicationId)
    .single();

  if (!application) return { success: false, error: "Application not found" };
  if (application.status !== "pending") {
    return { success: false, error: "Application is not pending" };
  }

  const shift = application.shift_request;
  if (shift && shift.filled_count >= shift.required_count) {
    return { success: false, error: "Shift is already fully booked" };
  }

  // Approve application
  const { error: updateError } = await supabase
    .from("shift_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: manager.id,
    })
    .eq("id", applicationId);

  if (updateError) return { success: false, error: updateError.message };

  // Increment filled_count
  if (application.shift_request_id) {
    await supabase.rpc("increment_filled_count", {
      shift_id: application.shift_request_id,
    });
  }

  // Create attendance record
  if (shift) {
    const { data: shiftDetail } = await supabase
      .from("shift_requests")
      .select("store_id, shift_date, start_time, end_time, break_minutes")
      .eq("id", application.shift_request_id)
      .single();

    if (shiftDetail) {
      await supabase.from("attendance_records").insert({
        application_id: applicationId,
        trainer_id: application.trainer_id,
        store_id: shiftDetail.store_id,
        shift_date: shiftDetail.shift_date,
        scheduled_start: shiftDetail.start_time,
        scheduled_end: shiftDetail.end_time,
        break_minutes: shiftDetail.break_minutes ?? 0,
        status: "scheduled",
      });
    }
  }

  // Phase 2: Notify trainer about approval
  const admin = createAdminClient();
  const { data: trainerRecord } = await admin
    .from("alumni_trainers")
    .select("auth_user_id")
    .eq("id", application.trainer_id)
    .single();

  if (trainerRecord) {
    await createNotification({
      userId: trainerRecord.auth_user_id,
      type: "push",
      category: "application_confirmed",
      title: "応募が承認されました",
      body: "シフトが確定しました。勤怠画面をご確認ください。",
      shiftRequestId: application.shift_request_id,
    });
  }

  return { success: true };
}

export async function rejectApplication(
  applicationId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) return { success: false, error: "Not a store manager" };

  // Get application info before rejecting (need trainer_id + shift_request_id)
  const { data: application } = await supabase
    .from("shift_applications")
    .select("trainer_id, shift_request_id")
    .eq("id", applicationId)
    .single();

  const { error } = await supabase
    .from("shift_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: manager.id,
    })
    .eq("id", applicationId);

  if (error) return { success: false, error: error.message };

  // Phase 2: Notify trainer about rejection
  if (application) {
    const admin = createAdminClient();
    const { data: trainerRecord } = await admin
      .from("alumni_trainers")
      .select("auth_user_id")
      .eq("id", application.trainer_id)
      .single();

    if (trainerRecord) {
      await createNotification({
        userId: trainerRecord.auth_user_id,
        type: "push",
        category: "application_rejected",
        title: "応募が見送りとなりました",
        body: "他のシフトをお探しください。",
        shiftRequestId: application.shift_request_id,
      });
    }
  }

  return { success: true };
}

export async function cancelApplication(
  applicationId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "Trainer not found" };

  const { error } = await supabase
    .from("shift_applications")
    .update({
      status: "cancelled",
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("trainer_id", trainer.id)
    .in("status", ["pending", "approved"]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getMyApplications(): Promise<
  ActionResult<ShiftApplication[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "Trainer not found" };

  const { data, error } = await supabase
    .from("shift_applications")
    .select("*, shift_request:shift_requests(*, store:stores(name, area))")
    .eq("trainer_id", trainer.id)
    .order("applied_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
