"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/actions/notifications";
import { calculateRate } from "@/actions/pricing";
import type { ActionResult, ShiftOffer, RateBreakdown } from "@/types/database";

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

  // Notify trainer (fail-safe: notification failure should not block offer creation)
  try {
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

    // B2: Send LINE notification if trainer has linked account
    const { sendLineOfferNotification } = await import("@/actions/line");
    await sendLineOfferNotification(offer.id);
  } catch (err) {
    console.error("[sendOffer] Notification failed (non-blocking):", err);
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

    // Only update availability if it exists (store offers have availability, HR offers don't)
    if (offer.availability_id) {
      await supabase
        .from("shift_availabilities")
        .update({ status: "open" })
        .eq("id", offer.availability_id);
    }

    // Notify the creator (store manager or HR user)
    const admin = createAdminClient();
    if (offer.created_by) {
      // Store manager offer
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
    } else if (offer.created_by_hr_id) {
      // HR offer
      await createNotification({
        userId: offer.created_by_hr_id,
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

  // 2. Update availability (only for store offers)
  if (offer.availability_id) {
    await supabase
      .from("shift_availabilities")
      .update({ status: "matched" })
      .eq("id", offer.availability_id);
  }

  // Determine source type
  const isHrOffer = !offer.created_by && offer.created_by_hr_id;
  const source = isHrOffer ? "hr_offer" : "direct_offer";

  // 3. Create shift_request
  const shiftRequestData: Record<string, unknown> = {
    store_id: offer.store_id,
    title: offer.title,
    shift_date: offer.shift_date,
    start_time: offer.start_time,
    end_time: offer.end_time,
    break_minutes: offer.break_minutes,
    required_count: 1,
    filled_count: 1,
    status: "closed",
    source,
    offer_id: offer.id,
    target_areas: [],
    published_at: new Date().toISOString(),
  };

  if (isHrOffer) {
    shiftRequestData.created_by_hr_id = offer.created_by_hr_id;
  } else {
    shiftRequestData.created_by = offer.created_by;
  }

  const { data: shiftRequest, error: srError } = await admin
    .from("shift_requests")
    .insert(shiftRequestData)
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
      reviewed_by: offer.created_by ?? null,
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

  // 6. Notify the creator (fail-safe)
  try {
    if (offer.created_by) {
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
    } else if (offer.created_by_hr_id) {
      await createNotification({
        userId: offer.created_by_hr_id,
        type: "push",
        category: "application_confirmed",
        title: "オファーが承諾されました",
        body: `${offer.title} — シフトが確定しました`,
      });
    }

    // B3: Send shift confirmation LINE notification to trainer
    const { sendLineShiftConfirmation } = await import("@/actions/line");
    await sendLineShiftConfirmation({
      trainerId: trainer.id,
      storeName: "", // Will be fetched inside the function
      storeId: offer.store_id,
      shiftDate: offer.shift_date,
      startTime: offer.start_time,
      endTime: offer.end_time,
    });
  } catch (err) {
    console.error("[respondToOffer] Notification failed (non-blocking):", err);
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
 * Delegates to shared calculateRate in pricing.ts.
 */
export async function calculateOfferRate(
  trainerId: string,
  storeId: string
): Promise<RateBreakdown> {
  return calculateRate({ trainerId, storeId, emergencyBonus: 0 });
}
