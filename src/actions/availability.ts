"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, ShiftAvailability } from "@/types/database";

interface SubmitAvailabilityInput {
  store_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  note?: string;
}

/**
 * Trainer submits shift availability for a specific store
 */
export async function submitAvailability(
  input: SubmitAvailabilityInput
): Promise<ActionResult<ShiftAvailability>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id, status, spot_status, blank_status")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };
  if (trainer.status !== "active" || trainer.spot_status !== "active") {
    return { success: false, error: "SPOTが有効ではありません" };
  }
  if (
    trainer.blank_status === "skill_check_required" ||
    trainer.blank_status === "training_required"
  ) {
    return { success: false, error: "ブランクステータスの解消が必要です" };
  }

  // Validate date is in the future
  const today = new Date().toISOString().split("T")[0];
  if (input.available_date < today) {
    return { success: false, error: "過去の日付は指定できません" };
  }

  // Check duplicate (same store + same date)
  const { data: existing } = await supabase
    .from("shift_availabilities")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("store_id", input.store_id)
    .eq("available_date", input.available_date)
    .in("status", ["open", "offered"])
    .maybeSingle();

  if (existing) {
    return { success: false, error: "同じ店舗・日付の申告が既にあります" };
  }

  const { data, error } = await supabase
    .from("shift_availabilities")
    .insert({
      trainer_id: trainer.id,
      store_id: input.store_id,
      available_date: input.available_date,
      start_time: input.start_time,
      end_time: input.end_time,
      note: input.note ?? null,
      status: "open",
    })
    .select()
    .single();

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Notify store managers about new availability
  const admin = createAdminClient();
  const { data: storeManagers } = await admin
    .from("store_managers")
    .select("auth_user_id")
    .eq("store_id", input.store_id)
    .eq("status", "active");

  if (storeManagers && storeManagers.length > 0) {
    const { createBatchNotifications } = await import("@/actions/notifications");
    await createBatchNotifications(
      storeManagers.map((m) => m.auth_user_id),
      {
        type: "push",
        category: "shift_published",
        title: "トレーナーからシフト希望が届きました",
      }
    );
  }

  return { success: true, data };
}

/**
 * Get trainer's own availabilities
 */
export async function getMyAvailabilities(): Promise<
  ActionResult<ShiftAvailability[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };

  const { data, error } = await supabase
    .from("shift_availabilities")
    .select("*, store:stores(name, area)")
    .eq("trainer_id", trainer.id)
    .gte("available_date", new Date().toISOString().split("T")[0])
    .order("available_date", { ascending: true });

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}

/**
 * Get availabilities for a specific store (store manager view)
 */
export async function getStoreAvailabilities(
  storeId: string
): Promise<ActionResult<ShiftAvailability[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data, error } = await supabase
    .from("shift_availabilities")
    .select("*, trainer:alumni_trainers(full_name, tenure_years, rank, blank_status)")
    .eq("store_id", storeId)
    .in("status", ["open", "offered"])
    .gte("available_date", new Date().toISOString().split("T")[0])
    .order("available_date", { ascending: true });

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}

/**
 * Cancel an availability (trainer only)
 */
export async function cancelAvailability(
  availabilityId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };

  const { error } = await supabase
    .from("shift_availabilities")
    .update({ status: "cancelled" })
    .eq("id", availabilityId)
    .eq("trainer_id", trainer.id)
    .in("status", ["open"]);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true };
}

/**
 * Get availability stats for HR/admin dashboard
 */
export async function getAvailabilityStats(): Promise<
  ActionResult<{ total: number; open: number; offered: number; matched: number }>
> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("shift_availabilities")
    .select("status")
    .gte("available_date", new Date().toISOString().split("T")[0]);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  const stats = {
    total: data?.length ?? 0,
    open: data?.filter((a) => a.status === "open").length ?? 0,
    offered: data?.filter((a) => a.status === "offered").length ?? 0,
    matched: data?.filter((a) => a.status === "matched").length ?? 0,
  };

  return { success: true, data: stats };
}

/**
 * Get all availabilities for HR dashboard
 */
export async function getAllAvailabilities(): Promise<
  ActionResult<ShiftAvailability[]>
> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("shift_availabilities")
    .select("*, trainer:alumni_trainers(full_name, tenure_years, rank), store:stores(name, area)")
    .in("status", ["open", "offered"])
    .gte("available_date", new Date().toISOString().split("T")[0])
    .order("available_date", { ascending: true })
    .limit(50);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}
