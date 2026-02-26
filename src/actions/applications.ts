"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateHourlyRate } from "./pricing";
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
    .select("status, filled_count, required_count")
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

  // Create application
  const { data, error } = await supabase
    .from("shift_applications")
    .insert({
      shift_request_id: shiftRequestId,
      trainer_id: trainer.id,
      confirmed_rate: rateBreakdown.total,
      rate_breakdown: rateBreakdown,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
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

  const { error } = await supabase
    .from("shift_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: manager.id,
    })
    .eq("id", applicationId);

  if (error) return { success: false, error: error.message };
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
