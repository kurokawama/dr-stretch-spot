"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  ShiftTemplate,
  ShiftRequest,
} from "@/types/database";

// =============================================
// S-7: Shift Template CRUD
// =============================================

export async function getShiftTemplates(
  storeId: string
): Promise<ActionResult<ShiftTemplate[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data, error } = await supabase
    .from("shift_templates")
    .select("*")
    .eq("store_id", storeId)
    .order("name");

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function createShiftTemplate(input: {
  store_id: string;
  name: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  required_count: number;
  required_certifications?: string[];
  is_recurring?: boolean;
  recurring_days?: number[];
}): Promise<ActionResult<ShiftTemplate>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data, error } = await supabase
    .from("shift_templates")
    .insert({
      store_id: input.store_id,
      created_by: user.id,
      name: input.name,
      title: input.title,
      description: input.description || null,
      start_time: input.start_time,
      end_time: input.end_time,
      break_minutes: input.break_minutes,
      required_count: input.required_count,
      required_certifications: input.required_certifications ?? [],
      is_recurring: input.is_recurring ?? false,
      recurring_days: input.recurring_days ?? [],
      is_active: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateShiftTemplate(
  templateId: string,
  updates: Partial<
    Pick<
      ShiftTemplate,
      | "name"
      | "title"
      | "description"
      | "start_time"
      | "end_time"
      | "break_minutes"
      | "required_count"
      | "required_certifications"
      | "is_recurring"
      | "recurring_days"
      | "is_active"
    >
  >
): Promise<ActionResult<ShiftTemplate>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data, error } = await supabase
    .from("shift_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteShiftTemplate(
  templateId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Soft delete by setting is_active = false
  const { error } = await supabase
    .from("shift_templates")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =============================================
// Create Shift from Template
// =============================================

export async function createShiftFromTemplate(
  templateId: string,
  shiftDate: string,
  targetAreas?: string[]
): Promise<ActionResult<ShiftRequest>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Get the template
  const { data: template, error: templateError } = await supabase
    .from("shift_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return { success: false, error: "テンプレートが見つかりません" };
  }

  // Get store info for target areas fallback
  const admin = createAdminClient();
  const { data: store } = await admin
    .from("stores")
    .select("area")
    .eq("id", template.store_id)
    .single();

  // Create shift request from template
  const { data: shift, error: shiftError } = await admin
    .from("shift_requests")
    .insert({
      store_id: template.store_id,
      created_by: user.id,
      title: template.title,
      description: template.description,
      shift_date: shiftDate,
      start_time: template.start_time,
      end_time: template.end_time,
      break_minutes: template.break_minutes,
      required_count: template.required_count,
      filled_count: 0,
      required_certifications: template.required_certifications,
      is_emergency: false,
      emergency_bonus_amount: 0,
      status: "pending_approval",
      target_areas: targetAreas ?? (store ? [store.area] : []),
    })
    .select()
    .single();

  if (shiftError) return { success: false, error: shiftError.message };
  return { success: true, data: shift };
}
