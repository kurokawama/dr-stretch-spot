"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateOfferRate } from "@/actions/offers";
import { createNotification } from "@/actions/notifications";
import { sendLineOfferNotification } from "@/actions/line";
import type {
  ActionResult,
  ShiftOffer,
  AlumniTrainer,
  Store,
  RateBreakdown,
} from "@/types/database";

// =============================================
// Types
// =============================================

interface HrCreateOfferInput {
  trainer_id: string;
  store_id: string;
  title: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
}

interface TrainerSearchResult {
  trainer: AlumniTrainer;
  store_name: string;
  store_area: string;
  estimated_rate: number;
}

// =============================================
// HR Search Trainers
// =============================================

export async function hrSearchTrainers(filters?: {
  area?: string;
  rank?: string;
  status?: string;
}): Promise<ActionResult<TrainerSearchResult[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "人事部権限が必要です" };
  }

  const admin = createAdminClient();

  let query = admin
    .from("alumni_trainers")
    .select("*")
    .eq("status", "active")
    .order("full_name");

  if (filters?.rank) {
    query = query.eq("rank", filters.rank);
  }

  const { data: trainers, error } = await query;
  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  if (!trainers || trainers.length === 0) {
    return { success: true, data: [] };
  }

  // Get all stores for area info
  const { data: stores } = await admin
    .from("stores")
    .select("id, name, area")
    .eq("status", "active");

  type StoreInfo = { id: string; name: string; area: string };
  const storeList = (stores ?? []) as StoreInfo[];

  // Filter by preferred area if specified
  const filteredTrainers = filters?.area
    ? trainers.filter(
        (t: AlumniTrainer) =>
          t.preferred_areas.includes(filters.area!) ||
          t.preferred_areas.length === 0
      )
    : trainers;

  // Build results with estimated rate
  const results: TrainerSearchResult[] = [];

  for (const trainer of filteredTrainers) {
    // Get a representative store for rate calc
    const preferredStoreArea = trainer.preferred_areas[0];
    const matchingStore = preferredStoreArea
      ? storeList.find((s) => s.area === preferredStoreArea)
      : storeList[0];

    if (!matchingStore) continue;

    try {
      const rateBreakdown = await calculateOfferRate(
        trainer.id,
        matchingStore.id
      );
      results.push({
        trainer,
        store_name: matchingStore.name,
        store_area: matchingStore.area,
        estimated_rate: rateBreakdown.total,
      });
    } catch {
      results.push({
        trainer,
        store_name: matchingStore.name,
        store_area: matchingStore.area,
        estimated_rate: 0,
      });
    }
  }

  return { success: true, data: results };
}

// =============================================
// HR Create Offer
// =============================================

export async function hrCreateOffer(
  input: HrCreateOfferInput
): Promise<ActionResult<ShiftOffer>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "人事部権限が必要です" };
  }

  // Validate trainer exists and is active
  const admin = createAdminClient();

  const { data: trainer } = await admin
    .from("alumni_trainers")
    .select("id, auth_user_id, full_name, status")
    .eq("id", input.trainer_id)
    .single();

  if (!trainer) return { success: false, error: "トレーナーが見つかりません" };
  if (trainer.status !== "active") {
    return { success: false, error: "このトレーナーは現在利用不可です" };
  }

  // Validate store exists
  const { data: store } = await admin
    .from("stores")
    .select("id, name")
    .eq("id", input.store_id)
    .single();

  if (!store) return { success: false, error: "店舗が見つかりません" };

  // Calculate rate
  let rateBreakdown: RateBreakdown;
  try {
    rateBreakdown = await calculateOfferRate(
      input.trainer_id,
      input.store_id
    );
  } catch {
    return { success: false, error: "時給計算に失敗しました" };
  }

  // Create offer (admin client to bypass RLS and FK constraints)
  const { data: offer, error } = await admin
    .from("shift_offers")
    .insert({
      availability_id: null,
      trainer_id: input.trainer_id,
      store_id: input.store_id,
      created_by: null,
      created_by_hr_id: user.id,
      title: input.title,
      shift_date: input.shift_date,
      start_time: input.start_time,
      end_time: input.end_time,
      break_minutes: input.break_minutes ?? 60,
      offered_rate: rateBreakdown.total,
      rate_breakdown: rateBreakdown,
      status: "pending",
    })
    .select()
    .single();

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Notify trainer (Web notification)
  await createNotification({
    userId: trainer.auth_user_id,
    type: "push",
    category: "application_confirmed",
    title: "人事部からオファーが届きました",
    body: `${input.title}（${store.name}）¥${rateBreakdown.total}/h`,
  });

  // Notify trainer (LINE push - if linked)
  await sendLineOfferNotification(offer.id);

  return { success: true, data: offer };
}

// =============================================
// Get HR Offers
// =============================================

export async function getHrOffers(): Promise<ActionResult<ShiftOffer[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return { success: false, error: "人事部権限が必要です" };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("shift_offers")
    .select("*, trainer:alumni_trainers(full_name, tenure_years, rank), store:stores(name, area)")
    .not("created_by_hr_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}

// =============================================
// Get All Stores (for HR store selector)
// =============================================

export async function getActiveStores(): Promise<ActionResult<Store[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", "active")
    .order("area")
    .order("name");

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true, data: data ?? [] };
}
