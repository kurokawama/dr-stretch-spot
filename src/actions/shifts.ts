"use server";

import { createClient } from "@/lib/supabase/server";
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
      status: "open",
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
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
