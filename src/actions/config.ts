"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  CostCeilingConfig,
  ConfigSnapshot,
  ConfigSnapshotType,
} from "@/types/database";

// =============================================
// H-4: Cost Ceiling Config
// =============================================

export async function getCostCeilingConfig(): Promise<
  ActionResult<CostCeilingConfig>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cost_ceiling_config")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateCostCeilingConfig(updates: {
  max_hourly_rate?: number;
  active_employee_ratio_threshold?: number;
  per_store_emergency_budget_default?: number;
}): Promise<ActionResult<CostCeilingConfig>> {
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

  if (!profile || !["hr", "admin"].includes(profile.role)) {
    return { success: false, error: "この操作を行う権限がありません" };
  }

  const admin = createAdminClient();

  // Get current config for snapshot
  const { data: currentConfig } = await admin
    .from("cost_ceiling_config")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Auto-create snapshot before update
  if (currentConfig) {
    await admin.from("config_snapshots").insert({
      snapshot_type: "cost_ceiling",
      snapshot_data: currentConfig,
      description: "Auto-snapshot before cost ceiling update",
      created_by: user.id,
    });
  }

  // Update
  const { data, error } = await admin
    .from("cost_ceiling_config")
    .update({
      ...updates,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Log the change
  await admin.from("rate_change_logs").insert({
    changed_by: user.id,
    change_type: "cost_ceiling_update",
    table_name: "cost_ceiling_config",
    record_id: data.id,
    old_values: currentConfig,
    new_values: updates,
    reason: "Cost ceiling configuration updated",
    affected_trainers_count: 0,
    estimated_cost_impact: null,
  });

  return { success: true, data };
}

export async function updateStoreEmergencyBudget(
  storeId: string,
  budget: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("stores")
    .update({
      emergency_budget_monthly: budget,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (error) return { success: false, error: error.message };

  // Log the change
  await admin.from("rate_change_logs").insert({
    changed_by: user.id,
    change_type: "store_budget_update",
    table_name: "stores",
    record_id: storeId,
    old_values: null,
    new_values: { emergency_budget_monthly: budget },
    reason: "Store emergency budget updated",
    affected_trainers_count: 0,
    estimated_cost_impact: null,
  });

  return { success: true };
}

// =============================================
// H-6: Config Snapshots / Rollback
// =============================================

export async function createConfigSnapshot(
  type: ConfigSnapshotType,
  description: string
): Promise<ActionResult<ConfigSnapshot>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  // Get current config data based on type
  let snapshotData: Record<string, unknown>;

  switch (type) {
    case "rate_config": {
      const { data } = await admin
        .from("hourly_rate_config")
        .select("*")
        .eq("is_active", true)
        .order("tenure_min_years");
      snapshotData = { configs: data ?? [] };
      break;
    }
    case "blank_rule_config": {
      const { data } = await admin
        .from("blank_rule_config")
        .select("*")
        .eq("is_active", true)
        .order("threshold_days");
      snapshotData = { configs: data ?? [] };
      break;
    }
    case "cost_ceiling": {
      const { data } = await admin
        .from("cost_ceiling_config")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();
      snapshotData = { config: data ?? {} };
      break;
    }
    default:
      return { success: false, error: "無効なスナップショットタイプです" };
  }

  const { data, error } = await admin
    .from("config_snapshots")
    .insert({
      snapshot_type: type,
      snapshot_data: snapshotData,
      description,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getConfigSnapshots(
  type?: ConfigSnapshotType
): Promise<ActionResult<ConfigSnapshot[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();
  let query = admin
    .from("config_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (type) {
    query = query.eq("snapshot_type", type);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function rollbackToSnapshot(
  snapshotId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Verify HR/Admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin"].includes(profile.role)) {
    return { success: false, error: "この操作を行う権限がありません" };
  }

  const admin = createAdminClient();

  // Get snapshot
  const { data: snapshot, error: snapError } = await admin
    .from("config_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (snapError || !snapshot) {
    return { success: false, error: "スナップショットが見つかりません" };
  }

  const snapshotData = snapshot.snapshot_data as Record<string, unknown>;

  try {
    switch (snapshot.snapshot_type) {
      case "rate_config": {
        const configs = (snapshotData.configs ?? []) as Array<Record<string, unknown>>;
        // Deactivate all current
        await admin
          .from("hourly_rate_config")
          .update({ is_active: false })
          .eq("is_active", true);

        // Restore from snapshot
        for (const config of configs) {
          await admin.from("hourly_rate_config").upsert({
            ...config,
            is_active: true,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "blank_rule_config": {
        const configs = (snapshotData.configs ?? []) as Array<Record<string, unknown>>;
        await admin
          .from("blank_rule_config")
          .update({ is_active: false })
          .eq("is_active", true);

        for (const config of configs) {
          await admin.from("blank_rule_config").upsert({
            ...config,
            is_active: true,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "cost_ceiling": {
        const config = snapshotData.config as Record<string, unknown>;
        if (config && config.id) {
          await admin
            .from("cost_ceiling_config")
            .update({
              max_hourly_rate: config.max_hourly_rate,
              active_employee_ratio_threshold:
                config.active_employee_ratio_threshold,
              per_store_emergency_budget_default:
                config.per_store_emergency_budget_default,
              updated_at: new Date().toISOString(),
            })
            .eq("is_active", true);
        }
        break;
      }
    }

    // Log rollback
    await admin.from("rate_change_logs").insert({
      changed_by: user.id,
      change_type: "config_rollback",
      table_name: snapshot.snapshot_type,
      record_id: snapshotId,
      old_values: null,
      new_values: snapshotData,
      reason: `Rollback to snapshot: ${snapshot.description}`,
      affected_trainers_count: 0,
      estimated_cost_impact: null,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Rollback failed",
    };
  }
}

// =============================================
// H-3: Blank Status Batch Update (On-demand)
// =============================================

export async function runBlankStatusBatch(): Promise<
  ActionResult<{ updated: number }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  // Get blank rules
  const { data: rules } = await admin
    .from("blank_rule_config")
    .select("rule_type, threshold_days")
    .eq("is_active", true)
    .order("threshold_days", { ascending: false });

  if (!rules || rules.length === 0) {
    return { success: false, error: "ブランクルールが未設定です" };
  }

  // Get active trainers
  const { data: trainers } = await admin
    .from("alumni_trainers")
    .select("id, last_shift_date, blank_status, spot_status")
    .eq("status", "active");

  if (!trainers) return { success: true, data: { updated: 0 } };

  const today = new Date();
  let updated = 0;

  for (const trainer of trainers) {
    if (trainer.spot_status !== "active" && trainer.spot_status !== null)
      continue;

    const lastShift = trainer.last_shift_date
      ? new Date(trainer.last_shift_date)
      : null;
    const daysSince = lastShift
      ? Math.floor(
          (today.getTime() - lastShift.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 9999;

    let newStatus = "ok";
    for (const rule of rules) {
      if (daysSince >= rule.threshold_days) {
        newStatus = rule.rule_type;
        break;
      }
    }

    if (newStatus !== trainer.blank_status) {
      await admin
        .from("alumni_trainers")
        .update({
          blank_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trainer.id);
      updated++;
    }
  }

  return { success: true, data: { updated } };
}
