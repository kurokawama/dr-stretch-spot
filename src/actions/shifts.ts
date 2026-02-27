"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, ShiftRequest } from "@/types/database";

interface CreateShiftInput {
  store_id: string;
  title: string;
  description?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  required_count?: number;
  required_certifications?: string[];
  is_emergency?: boolean;
  emergency_bonus_amount?: number;
  target_areas?: string[];
}

export async function createShiftRequest(
  input: CreateShiftInput
): Promise<ActionResult<ShiftRequest>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get store_manager record
  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) return { success: false, error: "Not a store manager" };
  if (manager.store_id !== input.store_id) {
    return { success: false, error: "Store mismatch" };
  }

  // Check emergency budget if emergency shift
  if (input.is_emergency && input.emergency_bonus_amount) {
    const { data: store } = await supabase
      .from("stores")
      .select("emergency_budget_monthly, emergency_budget_used")
      .eq("id", input.store_id)
      .single();

    if (store) {
      const remaining =
        store.emergency_budget_monthly - store.emergency_budget_used;
      const estimatedCost =
        input.emergency_bonus_amount * (input.required_count ?? 1);
      if (estimatedCost > remaining) {
        return {
          success: false,
          error: `Emergency budget insufficient. Remaining: ¥${remaining}`,
        };
      }
    }
  }

  const { data, error } = await supabase
    .from("shift_requests")
    .insert({
      ...input,
      created_by: manager.id,
      status: "pending_approval",
      target_areas: input.target_areas ?? [],
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/**
 * Approve a shift request (HR/admin only)
 */
export async function approveShiftRequest(
  shiftId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify HR/admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  // Get manager record for approved_by
  const admin = createAdminClient();
  const { data: manager } = await admin
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const { data: updatedShift, error } = await admin
    .from("shift_requests")
    .update({
      status: "open",
      approved_by: manager?.id ?? null,
      approved_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })
    .eq("id", shiftId)
    .eq("status", "pending_approval")
    .select("id, target_areas, title")
    .single();

  if (error) return { success: false, error: error.message };

  // Phase 2: Notify trainers in matching areas
  if (updatedShift?.target_areas && updatedShift.target_areas.length > 0) {
    const { data: matchingTrainers } = await admin
      .from("alumni_trainers")
      .select("auth_user_id, preferred_areas")
      .eq("status", "active")
      .eq("spot_status", "active");

    if (matchingTrainers) {
      const { createBatchNotifications } = await import("@/actions/notifications");
      const targetUserIds = matchingTrainers
        .filter((t) =>
          t.preferred_areas.some((area: string) =>
            updatedShift.target_areas.includes(area)
          )
        )
        .map((t) => t.auth_user_id);

      if (targetUserIds.length > 0) {
        await createBatchNotifications(targetUserIds, {
          type: "push",
          category: "shift_published",
          title: `New shift available: ${updatedShift.title}`,
          shiftRequestId: shiftId,
        });
      }
    }
  }

  return { success: true };
}

/**
 * Reject a shift request (HR/admin only)
 */
export async function rejectShiftRequest(
  shiftId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("shift_requests")
    .update({ status: "cancelled" })
    .eq("id", shiftId)
    .eq("status", "pending_approval");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get pending shift requests for HR approval
 */
export async function getPendingShifts(): Promise<ActionResult<ShiftRequest[]>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("shift_requests")
    .select("*, store:stores(name, area, prefecture), created_by_manager:store_managers!created_by(full_name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function searchShifts(filters: {
  area?: string;
  date_from?: string;
  date_to?: string;
  is_emergency?: boolean;
}): Promise<ActionResult<ShiftRequest[]>> {
  const supabase = await createClient();

  let query = supabase
    .from("shift_requests")
    .select("*, store:stores(*)")
    .eq("status", "open")
    .gte("shift_date", new Date().toISOString().split("T")[0])
    .order("shift_date", { ascending: true });

  if (filters.area) {
    query = query.eq("store.area", filters.area);
  }
  if (filters.date_from) {
    query = query.gte("shift_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("shift_date", filters.date_to);
  }
  if (filters.is_emergency !== undefined) {
    query = query.eq("is_emergency", filters.is_emergency);
  }

  const { data, error } = await query;

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function getShiftDetail(
  shiftId: string
): Promise<ActionResult<ShiftRequest>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shift_requests")
    .select("*, store:stores(*)")
    .eq("id", shiftId)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function cancelShiftRequest(
  shiftId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("shift_requests")
    .update({ status: "cancelled" })
    .eq("id", shiftId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
