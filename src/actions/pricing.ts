"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, RateBreakdown, HourlyRateConfig } from "@/types/database";

/**
 * Calculate the confirmed hourly rate for a trainer applying to a shift.
 * Rate = base_rate(tenure) + attendance_bonus(30d) + emergency_bonus
 * Rate is FIXED at application time.
 */
export async function calculateHourlyRate(
  trainerId: string,
  shiftRequestId: string
): Promise<RateBreakdown> {
  const supabase = await createClient();

  // 1. Get trainer info
  const { data: trainer, error: trainerError } = await supabase
    .from("alumni_trainers")
    .select("tenure_years")
    .eq("id", trainerId)
    .single();

  if (trainerError || !trainer) {
    throw new Error("Trainer not found");
  }

  // 2. Get active rate config for this tenure
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

  if (!rateConfig) {
    throw new Error("No rate configuration found for tenure: " + trainer.tenure_years);
  }

  // 3. Count attendance in last 30 days (sliding window)
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

  // 4. Check emergency bonus
  const { data: shiftRequest } = await supabase
    .from("shift_requests")
    .select("is_emergency, emergency_bonus_amount")
    .eq("id", shiftRequestId)
    .single();

  const emergencyBonus =
    shiftRequest?.is_emergency ? (shiftRequest.emergency_bonus_amount ?? 0) : 0;

  // 5. Calculate total
  let total = rateConfig.base_rate + attendanceBonus + emergencyBonus;

  // 6. Apply cost ceiling check (Phase 2)
  const admin = createAdminClient();
  const { data: ceilingConfig } = await admin
    .from("cost_ceiling_config")
    .select("max_hourly_rate")
    .eq("is_active", true)
    .limit(1)
    .single();

  // Check store-specific ceiling override
  if (shiftRequest) {
    const { data: shift } = await supabase
      .from("shift_requests")
      .select("store_id")
      .eq("id", shiftRequestId)
      .single();

    if (shift) {
      const { data: store } = await admin
        .from("stores")
        .select("cost_ceiling_override")
        .eq("id", shift.store_id)
        .single();

      const maxRate = store?.cost_ceiling_override ?? ceilingConfig?.max_hourly_rate;
      if (maxRate && total > maxRate) {
        total = maxRate;
      }
    }
  } else if (ceilingConfig?.max_hourly_rate && total > ceilingConfig.max_hourly_rate) {
    total = ceilingConfig.max_hourly_rate;
  }

  return {
    base_rate: rateConfig.base_rate,
    tenure_years: trainer.tenure_years,
    attendance_bonus: attendanceBonus,
    attendance_count_30d: count30d,
    emergency_bonus: emergencyBonus,
    total,
  };
}

/**
 * Check if a shift should auto-trigger emergency status.
 * Triggers when: shift created > 24h ago AND fill rate < 50%
 */
export async function checkEmergencyAutoTrigger(
  shiftRequestId: string
): Promise<ActionResult<boolean>> {
  const admin = createAdminClient();

  const { data: shift } = await admin
    .from("shift_requests")
    .select("id, created_at, required_count, filled_count, is_emergency, emergency_bonus_amount, status, store_id")
    .eq("id", shiftRequestId)
    .single();

  if (!shift) return { success: false, error: "Shift not found" };
  if (shift.is_emergency) return { success: true, data: false }; // Already emergency
  if (shift.status !== "open") return { success: true, data: false };

  const createdAt = new Date(shift.created_at);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  const fillRate = shift.required_count > 0
    ? shift.filled_count / shift.required_count
    : 1;

  // Auto-trigger: 24h+ AND fill rate < 50%
  if (hoursSinceCreation >= 24 && fillRate < 0.5) {
    // Set default emergency bonus (500 yen)
    const defaultBonus = 500;

    await admin
      .from("shift_requests")
      .update({
        is_emergency: true,
        emergency_bonus_amount: defaultBonus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shiftRequestId);

    // Create notification for HR/Admin
    const { createNotification } = await import("@/actions/notifications");

    // Get HR/Admin users
    const { data: hrAdmins } = await admin
      .from("store_managers")
      .select("auth_user_id")
      .in("role", ["hr", "admin"]);

    if (hrAdmins) {
      for (const user of hrAdmins) {
        await createNotification({
          userId: user.auth_user_id,
          type: "push",
          category: "emergency_auto_trigger",
          title: "Emergency auto-triggered for unfilled shift",
          body: `Shift ${shiftRequestId} auto-escalated to emergency after 24h with <50% fill rate`,
          shiftRequestId: shiftRequestId,
        });
      }
    }

    return { success: true, data: true };
  }

  return { success: true, data: false };
}

/**
 * Simulate cost impact of rate changes.
 * Used by HR control panel (H-2).
 */
export async function simulateRateChange(
  newConfigs: Partial<HourlyRateConfig>[]
): Promise<{
  affected_trainers: number;
  current_monthly_cost: number;
  projected_monthly_cost: number;
  difference: number;
}> {
  const supabase = await createClient();

  // Get active trainers
  const { data: trainers } = await supabase
    .from("alumni_trainers")
    .select("id, tenure_years")
    .eq("status", "active");

  if (!trainers || trainers.length === 0) {
    return {
      affected_trainers: 0,
      current_monthly_cost: 0,
      projected_monthly_cost: 0,
      difference: 0,
    };
  }

  // Get current configs
  const { data: currentConfigs } = await supabase
    .from("hourly_rate_config")
    .select("*")
    .eq("is_active", true)
    .order("tenure_min_years");

  // Calculate current cost (avg 8h/day, 5 days/month estimate)
  const AVG_MONTHLY_HOURS = 40;
  let currentCost = 0;
  let projectedCost = 0;

  for (const trainer of trainers) {
    // Current rate
    const currentRate = currentConfigs?.find(
      (c: HourlyRateConfig) =>
        trainer.tenure_years >= c.tenure_min_years &&
        (c.tenure_max_years === null || trainer.tenure_years < c.tenure_max_years)
    );
    if (currentRate) {
      currentCost += currentRate.base_rate * AVG_MONTHLY_HOURS;
    }

    // Projected rate
    const newRate = newConfigs.find(
      (c) =>
        c.tenure_min_years !== undefined &&
        trainer.tenure_years >= c.tenure_min_years &&
        (c.tenure_max_years === undefined ||
          c.tenure_max_years === null ||
          trainer.tenure_years < c.tenure_max_years)
    );
    if (newRate?.base_rate) {
      projectedCost += newRate.base_rate * AVG_MONTHLY_HOURS;
    } else if (currentRate) {
      projectedCost += currentRate.base_rate * AVG_MONTHLY_HOURS;
    }
  }

  return {
    affected_trainers: trainers.length,
    current_monthly_cost: currentCost,
    projected_monthly_cost: projectedCost,
    difference: projectedCost - currentCost,
  };
}
