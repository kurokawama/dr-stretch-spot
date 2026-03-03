"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/actions/notifications";
import type { ActionResult, ShiftOffer, RateBreakdown, HourlyRateConfig } from "@/types/database";

interface SendOfferInput {
  availability_id: string;
  title: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
}

/**
 * Store manager sends a direct offer to a trainer based on their availability
 */
export async function sendOffer(
  input: SendOfferInput
): Promise<ActionResult<ShiftOffer>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Get manager record
  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) return { success: false, error: "店舗マネージャー権限が必要です" };

  // Get availability
  const { data: availability } = await supabase
    .from("shift_availabilities")
    .select("id, trainer_id, store_id, status")
    .eq("id", input.availability_id)
    .single();

  if (!availability) return { success: false, error: "申告が見つかりません" };
  if (availability.status !== "open") {
    return { success: false, error: "この申告は既にオファー済みまたは無効です" };
  }
  if (availability.store_id !== manager.store_id) {
    return { success: false, error: "自店舗の申告のみオファーできます" };
  }

  // Calculate rate for the trainer (no shift_request yet, so no emergency bonus)
  const rateBreakdown = await calculateOfferRate(
    availability.trainer_id,
    manager.store_id
  );

  // Create offer
  const { data: offer, error } = await supabase
    .from("shift_offers")
    .insert({
      availability_id: input.availability_id,
      trainer_id: availability.trainer_id,
      store_id: manager.store_id,
      created_by: manager.id,
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

  if (error) return { success: false, error: error.message };

  // Update availability status
  await supabase
    .from("shift_availabilities")
    .update({ status: "offered" })
    .eq("id", input.availability_id);

  // Notify trainer
  const admin = createAdminClient();
  const { data: trainerRecord } = await admin
    .from("alumni_trainers")
    .select("auth_user_id")
    .eq("id", availability.trainer_id)
    .single();

  if (trainerRecord) {
    await createNotification({
      userId: trainerRecord.auth_user_id,
      type: "push",
      category: "application_confirmed",
      title: "店舗からオファーが届きました",
      body: `${input.title}（¥${rateBreakdown.total}/h）`,
    });
  }

  return { success: true, data: offer };
}

/**
 * Trainer responds to an offer (accept or decline)
 */
export async function respondToOffer(
  offerId: string,
  accept: boolean
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

  // Get offer details
  const { data: offer } = await supabase
    .from("shift_offers")
    .select("*")
    .eq("id", offerId)
    .eq("trainer_id", trainer.id)
    .eq("status", "pending")
    .single();

  if (!offer) return { success: false, error: "オファーが見つかりません" };

  if (!accept) {
    // Decline: revert availability to open
    await supabase
      .from("shift_offers")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    await supabase
      .from("shift_availabilities")
      .update({ status: "open" })
      .eq("id", offer.availability_id);

    // Notify store manager
    const admin = createAdminClient();
    const { data: mgr } = await admin
      .from("store_managers")
      .select("auth_user_id")
      .eq("id", offer.created_by)
      .single();

    if (mgr) {
      await createNotification({
        userId: mgr.auth_user_id,
        type: "push",
        category: "application_cancelled",
        title: "オファーが辞退されました",
        body: offer.title,
      });
    }

    return { success: true };
  }

  // Accept: create shift_request + shift_application + attendance_record
  const admin = createAdminClient();

  // 1. Update offer
  await supabase
    .from("shift_offers")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId);

  // 2. Update availability
  await supabase
    .from("shift_availabilities")
    .update({ status: "matched" })
    .eq("id", offer.availability_id);

  // 3. Create shift_request (direct offer, no HR approval needed)
  const { data: shiftRequest, error: srError } = await admin
    .from("shift_requests")
    .insert({
      store_id: offer.store_id,
      created_by: offer.created_by,
      title: offer.title,
      shift_date: offer.shift_date,
      start_time: offer.start_time,
      end_time: offer.end_time,
      break_minutes: offer.break_minutes,
      required_count: 1,
      filled_count: 1,
      status: "closed",
      source: "direct_offer",
      offer_id: offer.id,
      target_areas: [],
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (srError) return { success: false, error: srError.message };

  // 4. Create shift_application
  const { data: application, error: appError } = await admin
    .from("shift_applications")
    .insert({
      shift_request_id: shiftRequest.id,
      trainer_id: trainer.id,
      confirmed_rate: offer.offered_rate,
      rate_breakdown: offer.rate_breakdown,
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: offer.created_by,
    })
    .select()
    .single();

  if (appError) return { success: false, error: appError.message };

  // 5. Create attendance_record
  await admin.from("attendance_records").insert({
    application_id: application.id,
    trainer_id: trainer.id,
    store_id: offer.store_id,
    shift_date: offer.shift_date,
    scheduled_start: offer.start_time,
    scheduled_end: offer.end_time,
    break_minutes: offer.break_minutes,
    status: "scheduled",
  });

  // 6. Notify store manager
  const { data: mgr } = await admin
    .from("store_managers")
    .select("auth_user_id")
    .eq("id", offer.created_by)
    .single();

  if (mgr) {
    await createNotification({
      userId: mgr.auth_user_id,
      type: "push",
      category: "application_confirmed",
      title: "オファーが承諾されました",
      body: `${offer.title} — シフトが確定しました`,
    });
  }

  return { success: true };
}

/**
 * Get offers received by the trainer
 */
export async function getTrainerOffers(): Promise<ActionResult<ShiftOffer[]>> {
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
    .from("shift_offers")
    .select("*, store:stores(name, area)")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

/**
 * Get offers sent by the store
 */
export async function getStoreOffers(
  storeId: string
): Promise<ActionResult<ShiftOffer[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shift_offers")
    .select("*, trainer:alumni_trainers(full_name, tenure_years, rank)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

/**
 * Calculate hourly rate for a direct offer (no shift_request).
 * Emergency bonus is always 0 for direct offers.
 */
async function calculateOfferRate(
  trainerId: string,
  storeId: string
): Promise<RateBreakdown> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("tenure_years")
    .eq("id", trainerId)
    .single();

  if (!trainer) throw new Error("Trainer not found");

  const { data: rateConfigs } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("is_active", true)
    .lte("tenure_min_years", trainer.tenure_years)
    .order("tenure_min_years", { ascending: false });

  const rateConfig = rateConfigs?.find(
    (rc: HourlyRateConfig) =>
      rc.tenure_max_years === null ||
      trainer.tenure_years < rc.tenure_max_years
  );

  if (!rateConfig) throw new Error("No rate configuration found");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: attendanceCount } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", trainerId)
    .in("status", ["clocked_out", "verified"])
    .gte("shift_date", thirtyDaysAgo.toISOString().split("T")[0]);

  const count30d = attendanceCount ?? 0;
  const attendanceBonus =
    count30d >= rateConfig.attendance_bonus_threshold
      ? rateConfig.attendance_bonus_amount
      : 0;

  let total = rateConfig.base_rate + attendanceBonus;

  // Apply cost ceiling
  const { data: ceilingConfig } = await admin
    .from("cost_ceiling_config")
    .select("max_hourly_rate")
    .eq("is_active", true)
    .limit(1)
    .single();

  const { data: store } = await admin
    .from("stores")
    .select("cost_ceiling_override")
    .eq("id", storeId)
    .single();

  const maxRate = store?.cost_ceiling_override ?? ceilingConfig?.max_hourly_rate;
  if (maxRate && total > maxRate) {
    total = maxRate;
  }

  return {
    base_rate: rateConfig.base_rate,
    tenure_years: trainer.tenure_years,
    attendance_bonus: attendanceBonus,
    attendance_count_30d: count30d,
    emergency_bonus: 0,
    total,
  };
}
