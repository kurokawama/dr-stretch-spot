"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  AdminKPIs,
  AlumniTrainer,
  StoreWithManager,
  Store,
  BudgetReport,
  SkillCheck,
  SkillCheckResult,
  BlankStatus,
} from "@/types/database";

// =============================================
// A-1: Admin Dashboard KPIs
// =============================================

export async function getAdminKPIs(): Promise<ActionResult<AdminKPIs>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  // Get trainer counts
  const { data: trainers } = await admin
    .from("alumni_trainers")
    .select("id, status, blank_status, spot_status");

  const total_trainers = trainers?.length ?? 0;
  const active_trainers =
    trainers?.filter(
      (t) => t.status === "active" && t.spot_status === "active"
    ).length ?? 0;

  // Blank status distribution
  const blank_distribution: Record<BlankStatus, number> = {
    ok: 0,
    alert_60: 0,
    skill_check_required: 0,
    training_required: 0,
  };
  trainers
    ?.filter((t) => t.status === "active")
    .forEach((t) => {
      const status = (t.blank_status || "ok") as BlankStatus;
      blank_distribution[status]++;
    });

  // Monthly shift stats (current month in JST)
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const startOfMonth = new Date(jstNow);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  const { data: shifts } = await admin
    .from("shift_requests")
    .select("id, required_count, filled_count, status")
    .gte("shift_date", monthStart);

  const monthly_shifts = shifts?.length ?? 0;
  const totalRequired = shifts?.reduce((s, r) => s + r.required_count, 0) ?? 0;
  const totalFilled = shifts?.reduce((s, r) => s + r.filled_count, 0) ?? 0;
  const monthly_fill_rate =
    totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;

  // Monthly cost from attendance records
  const { data: attendance } = await admin
    .from("attendance_records")
    .select("id, application_id")
    .gte("shift_date", monthStart)
    .in("status", ["clocked_out", "verified"]);

  let monthly_cost = 0;
  if (attendance && attendance.length > 0) {
    const appIds = attendance.map((a) => a.application_id);
    const { data: apps } = await admin
      .from("shift_applications")
      .select("id, confirmed_rate")
      .in("id", appIds);

    if (apps) {
      // Estimate cost from confirmed rates * hours
      const { data: records } = await admin
        .from("attendance_records")
        .select("application_id, actual_work_minutes")
        .gte("shift_date", monthStart)
        .in("status", ["clocked_out", "verified"]);

      records?.forEach((rec) => {
        const app = apps.find((a) => a.id === rec.application_id);
        if (app && rec.actual_work_minutes) {
          monthly_cost += (app.confirmed_rate / 60) * rec.actual_work_minutes;
        }
      });
    }
  }

  // Budget alerts (stores over 80% emergency budget)
  const { data: stores } = await admin
    .from("stores")
    .select(
      "id, name, emergency_budget_monthly, emergency_budget_used, status"
    )
    .eq("status", "active");

  const budget_alerts =
    stores
      ?.filter(
        (s) =>
          s.emergency_budget_monthly > 0 &&
          s.emergency_budget_used / s.emergency_budget_monthly >= 0.8
      )
      .map((s) => ({
        store_id: s.id,
        store_name: s.name,
        budget: s.emergency_budget_monthly,
        used: s.emergency_budget_used,
        usage_rate: Math.round(
          (s.emergency_budget_used / s.emergency_budget_monthly) * 100
        ),
      })) ?? [];

  return {
    success: true,
    data: {
      total_trainers,
      active_trainers,
      active_rate:
        total_trainers > 0
          ? Math.round((active_trainers / total_trainers) * 100)
          : 0,
      monthly_shifts,
      monthly_fill_rate,
      monthly_cost: Math.round(monthly_cost),
      blank_distribution,
      budget_alerts,
    },
  };
}

// =============================================
// A-2: All Trainers Management
// =============================================

export async function getAllTrainers(filters?: {
  status?: string;
  blank_status?: string;
  area?: string;
  search?: string;
}): Promise<ActionResult<AlumniTrainer[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();
  let query = admin.from("alumni_trainers").select("*").order("full_name");

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.blank_status) {
    query = query.eq("blank_status", filters.blank_status);
  }
  if (filters?.area) {
    query = query.contains("preferred_areas", [filters.area]);
  }
  if (filters?.search) {
    // Sanitize search input to prevent PostgREST filter injection
    const sanitized = filters.search.replace(/[%_\\'"(),]/g, "");
    if (sanitized.length > 0) {
      query = query.or(
        `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

// =============================================
// A-3: Store Management
// =============================================

export async function getStoresWithManagers(): Promise<
  ActionResult<StoreWithManager[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { data: stores, error: storesError } = await admin
    .from("stores")
    .select("*")
    .order("name");

  if (storesError) return { success: false, error: storesError.message };

  const { data: managers } = await admin
    .from("store_managers")
    .select("*")
    .eq("status", "active");

  const storesWithManagers: StoreWithManager[] = (stores ?? []).map((store) => ({
    ...store,
    managers:
      managers?.filter((m) => m.store_id === store.id) ?? [],
  }));

  return { success: true, data: storesWithManagers };
}

export async function updateStoreConfig(
  storeId: string,
  updates: Partial<
    Pick<
      Store,
      | "name"
      | "area"
      | "address"
      | "auto_confirm"
      | "emergency_budget_monthly"
      | "cost_ceiling_override"
    >
  >
): Promise<ActionResult<Store>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("stores")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", storeId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// =============================================
// A-4: Monthly Budget Report
// =============================================

export async function getMonthlyBudgetReport(): Promise<
  ActionResult<BudgetReport[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { data: stores } = await admin
    .from("stores")
    .select("id, name, area, emergency_budget_monthly, emergency_budget_used")
    .eq("status", "active")
    .order("area");

  if (!stores) return { success: true, data: [] };

  // Use JST for month start
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const startOfMonth = new Date(jstNow);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  // Batch query: get all attendance records for all stores at once (fixes N+1)
  const storeIds = stores.map((s) => s.id);
  const { data: allRecords } = await admin
    .from("attendance_records")
    .select("id, trainer_id, actual_work_minutes, application_id, store_id")
    .in("store_id", storeIds)
    .gte("shift_date", monthStart)
    .in("status", ["clocked_out", "verified"]);

  // Batch query: get all related applications at once
  const allAppIds = [...new Set((allRecords ?? []).map((r) => r.application_id))];
  let appsMap = new Map<string, { id: string; confirmed_rate: number }>();
  if (allAppIds.length > 0) {
    const { data: allApps } = await admin
      .from("shift_applications")
      .select("id, confirmed_rate")
      .in("id", allAppIds);
    if (allApps) {
      appsMap = new Map(allApps.map((a) => [a.id, a]));
    }
  }

  // Group records by store_id
  const recordsByStore = new Map<string, typeof allRecords>();
  for (const rec of allRecords ?? []) {
    const storeRecords = recordsByStore.get(rec.store_id) ?? [];
    storeRecords.push(rec);
    recordsByStore.set(rec.store_id, storeRecords);
  }

  const reports: BudgetReport[] = stores.map((store) => {
    const records = recordsByStore.get(store.id) ?? [];
    let total_shift_cost = 0;
    const trainerIds = new Set<string>();

    records.forEach((rec) => {
      trainerIds.add(rec.trainer_id);
      const app = appsMap.get(rec.application_id);
      if (app && rec.actual_work_minutes) {
        total_shift_cost += (app.confirmed_rate / 60) * rec.actual_work_minutes;
      }
    });

    return {
      store_id: store.id,
      store_name: store.name,
      area: store.area,
      emergency_budget: store.emergency_budget_monthly,
      emergency_used: store.emergency_budget_used,
      total_shift_cost: Math.round(total_shift_cost),
      shift_count: records.length,
      trainer_count: trainerIds.size,
    };
  });

  return { success: true, data: reports };
}

// =============================================
// A-6: Skill Check Management
// =============================================

export async function getSkillCheckSchedule(filters?: {
  result?: string;
  check_type?: string;
}): Promise<ActionResult<SkillCheck[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();
  let query = admin
    .from("skill_checks")
    .select("*")
    .order("check_date", { ascending: false })
    .limit(100);

  if (filters?.result) {
    query = query.eq("result", filters.result);
  }
  if (filters?.check_type) {
    query = query.eq("check_type", filters.check_type);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function createSkillCheck(input: {
  trainer_id: string;
  check_type: "skill_check" | "training";
  check_date: string;
  notes?: string;
}): Promise<ActionResult<SkillCheck>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("skill_checks")
    .insert({
      trainer_id: input.trainer_id,
      checked_by: user.id,
      check_type: input.check_type,
      check_date: input.check_date,
      result: "pending",
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateSkillCheckResult(
  checkId: string,
  result: SkillCheckResult,
  score?: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  // Get the skill check to find trainer
  const { data: check } = await admin
    .from("skill_checks")
    .select("trainer_id, check_type")
    .eq("id", checkId)
    .single();

  if (!check) return { success: false, error: "スキルチェックが見つかりません" };

  // Update the skill check
  const { error } = await admin
    .from("skill_checks")
    .update({
      result,
      score: score ?? null,
      checked_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkId);

  if (error) return { success: false, error: error.message };

  // If passed, update trainer blank status
  if (result === "pass") {
    const updateField =
      check.check_type === "training"
        ? { training_completed_at: new Date().toISOString() }
        : { skill_check_completed_at: new Date().toISOString() };

    await admin
      .from("alumni_trainers")
      .update({
        blank_status: "ok",
        ...updateField,
        updated_at: new Date().toISOString(),
      })
      .eq("id", check.trainer_id);
  }

  return { success: true };
}

// =============================================
// Trainers requiring attention (for A-6)
// =============================================

export async function getTrainersRequiringChecks(): Promise<
  ActionResult<AlumniTrainer[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("alumni_trainers")
    .select("*")
    .eq("status", "active")
    .in("blank_status", ["skill_check_required", "training_required"])
    .order("blank_status")
    .order("last_shift_date", { ascending: true, nullsFirst: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
