"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  HourlyRateConfig,
  BlankRuleConfig,
  RateChangeLog,
} from "@/types/database";

// =============================================
// Hourly Rate Config CRUD
// =============================================

export async function getRateConfigs(): Promise<
  ActionResult<HourlyRateConfig[]>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("is_active", true)
    .order("tenure_min_years");

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}

export async function updateRateConfig(
  configId: string,
  updates: {
    base_rate?: number;
    attendance_bonus_threshold?: number;
    attendance_bonus_amount?: number;
  },
  reason: string
): Promise<ActionResult<HourlyRateConfig>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Verify HR/Admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "この操作を行う権限がありません" };
  }

  // Get manager record for logging (optional for HR users)
  const { data: manager } = await supabase
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const changedBy = manager?.id ?? user.id;

  // Get old values for audit log
  const { data: oldConfig } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("id", configId)
    .single();

  if (!oldConfig) return { success: false, error: "設定が見つかりません" };

  // Update config
  const { data: newConfig, error } = await supabase
    .from("hourly_rate_config")
    .update(updates)
    .eq("id", configId)
    .select()
    .single();

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Count affected trainers
  const { count } = await supabase
    .from("alumni_trainers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("tenure_years", oldConfig.tenure_min_years)
    .lte(
      "tenure_years",
      oldConfig.tenure_max_years ?? 999
    );

  // Create audit log
  await supabase.from("rate_change_logs").insert({
    changed_by: changedBy,
    change_type: "rate_update",
    table_name: "hourly_rate_config",
    record_id: configId,
    old_values: oldConfig,
    new_values: newConfig,
    reason,
    affected_trainers_count: count ?? 0,
    estimated_cost_impact: null,
  });

  return { success: true, data: newConfig };
}

export async function createRateConfig(
  config: {
    tenure_min_years: number;
    tenure_max_years: number | null;
    base_rate: number;
    attendance_bonus_threshold: number;
    attendance_bonus_amount: number;
    effective_from: string;
  },
  reason: string
): Promise<ActionResult<HourlyRateConfig>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const changedBy = manager?.id ?? user.id;

  const { data, error } = await supabase
    .from("hourly_rate_config")
    .insert({
      ...config,
      is_active: true,
      created_by: changedBy,
    })
    .select()
    .single();

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Audit log
  await supabase.from("rate_change_logs").insert({
    changed_by: changedBy,
    change_type: "rate_create",
    table_name: "hourly_rate_config",
    record_id: data.id,
    old_values: null,
    new_values: data,
    reason,
    affected_trainers_count: 0,
  });

  return { success: true, data };
}

export async function deleteRateConfig(
  configId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const changedBy = manager?.id ?? user.id;

  // Get old values
  const { data: oldConfig } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("id", configId)
    .single();

  // Soft delete (deactivate)
  const { error } = await supabase
    .from("hourly_rate_config")
    .update({ is_active: false })
    .eq("id", configId);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Audit log
  await supabase.from("rate_change_logs").insert({
    changed_by: changedBy,
    change_type: "rate_delete",
    table_name: "hourly_rate_config",
    record_id: configId,
    old_values: oldConfig,
    new_values: null,
    reason,
  });

  return { success: true };
}

// =============================================
// Blank Rule Config CRUD
// =============================================

export async function getBlankRules(): Promise<
  ActionResult<BlankRuleConfig[]>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blank_rule_config")
    .select("*")
    .eq("is_active", true)
    .order("threshold_days");

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}

export async function updateBlankRule(
  ruleId: string,
  updates: {
    threshold_days?: number;
    action_required?: string;
    description?: string;
  },
  reason: string
): Promise<ActionResult<BlankRuleConfig>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const changedBy = manager?.id ?? user.id;

  const { data: oldRule } = await supabase
    .from("blank_rule_config")
    .select("*")
    .eq("id", ruleId)
    .single();

  const { data, error } = await supabase
    .from("blank_rule_config")
    .update(updates)
    .eq("id", ruleId)
    .select()
    .single();

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Audit log
  await supabase.from("rate_change_logs").insert({
    changed_by: changedBy,
    change_type: "blank_rule_update",
    table_name: "blank_rule_config",
    record_id: ruleId,
    old_values: oldRule,
    new_values: data,
    reason,
  });

  return { success: true, data };
}

// =============================================
// Audit Log
// =============================================

export async function getAuditLogs(filters?: {
  change_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<ActionResult<RateChangeLog[]>> {
  const supabase = await createClient();

  let query = supabase
    .from("rate_change_logs")
    .select("*, changed_by_manager:store_managers!changed_by(full_name, email)")
    .order("created_at", { ascending: false });

  if (filters?.change_type) {
    query = query.eq("change_type", filters.change_type);
  }
  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  query = query.limit(filters?.limit ?? 50);

  const { data, error } = await query;

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}
