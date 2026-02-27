"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResignationReason } from "@/types/database";

// =============================================
// Employee Actions
// =============================================

export async function submitResignation(formData: {
  employeeNumber?: string;
  storeId?: string;
  fullName: string;
  fullNameKana?: string;
  phone?: string;
  employmentStartDate?: string;
  desiredResignationDate: string;
  lastWorkingDate?: string;
  resignationReason?: ResignationReason;
  resignationReasonDetail?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  const { data, error } = await supabase
    .from("resignation_requests")
    .insert({
      auth_user_id: user.id,
      employee_number: formData.employeeNumber || null,
      store_id: formData.storeId || null,
      full_name: formData.fullName,
      full_name_kana: formData.fullNameKana || null,
      phone: formData.phone || null,
      employment_start_date: formData.employmentStartDate || null,
      desired_resignation_date: formData.desiredResignationDate,
      last_working_date: formData.lastWorkingDate || null,
      resignation_reason: formData.resignationReason || null,
      resignation_reason_detail: formData.resignationReasonDetail || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getMyResignation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resignation_requests")
    .select("*, store:stores(name, area)")
    .eq("auth_user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function cancelResignation(resignationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  const { error } = await supabase
    .from("resignation_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", resignationId)
    .eq("auth_user_id", user.id)
    .in("status", ["draft", "submitted"]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =============================================
// HR Actions
// =============================================

export async function getAllResignations(filters?: {
  status?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "admin", "area_manager"].includes(profile.role)) {
    return [];
  }

  let query = supabase
    .from("resignation_requests")
    .select("*, store:stores(name, area)")
    .order("submitted_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function receiveResignation(resignationId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("resignation_requests")
    .update({
      status: "received",
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", resignationId)
    .eq("status", "submitted");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function completeResignation(resignationId: string) {
  const admin = createAdminClient();

  // 1. Get resignation data
  const { data: resignation, error: fetchError } = await admin
    .from("resignation_requests")
    .select("*")
    .eq("id", resignationId)
    .single();

  if (fetchError || !resignation) {
    return { success: false, error: "退職意向が見つかりません" };
  }

  if (!["received", "accepted"].includes(resignation.status)) {
    return { success: false, error: "この退職意向は完了処理できません" };
  }

  // 2. Calculate tenure_years
  let tenureYears = 0;
  if (resignation.employment_start_date) {
    const start = new Date(resignation.employment_start_date);
    const end = resignation.desired_resignation_date
      ? new Date(resignation.desired_resignation_date)
      : new Date();
    tenureYears = Math.round(
      ((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) * 10
    ) / 10;
  }

  // 3. Create alumni_trainers record (spot_status: 'registered' — not yet active)
  const { data: existingTrainer } = await admin
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", resignation.auth_user_id)
    .maybeSingle();

  let trainerId: string;

  if (existingTrainer) {
    // Update existing record
    await admin
      .from("alumni_trainers")
      .update({
        resignation_id: resignationId,
        employment_end_date: resignation.desired_resignation_date,
        spot_status: "registered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingTrainer.id);
    trainerId = existingTrainer.id;
  } else {
    // Create new record
    const { data: newTrainer, error: trainerError } = await admin
      .from("alumni_trainers")
      .insert({
        auth_user_id: resignation.auth_user_id,
        email:
          (
            await admin.auth.admin.getUserById(resignation.auth_user_id)
          ).data.user?.email ?? "",
        full_name: resignation.full_name,
        full_name_kana: resignation.full_name_kana,
        phone: resignation.phone,
        tenure_years: tenureYears,
        employment_start_date: resignation.employment_start_date,
        employment_end_date: resignation.desired_resignation_date,
        resignation_id: resignationId,
        status: "active",
        spot_status: "registered",
      })
      .select("id")
      .single();

    if (trainerError) {
      return { success: false, error: "退職者レコード作成失敗: " + trainerError.message };
    }
    trainerId = newTrainer.id;
  }

  // 4. Update profiles role: employee → trainer
  await admin
    .from("profiles")
    .update({
      role: "trainer",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resignation.auth_user_id);

  // 5. Mark resignation as completed
  const { error: completeError } = await admin
    .from("resignation_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", resignationId);

  if (completeError) {
    return { success: false, error: completeError.message };
  }

  return { success: true, trainerId };
}

// =============================================
// SPOT Status Actions
// =============================================

export async function activateSpot(formData: {
  preferredAreas: string[];
  preferredTimeSlots: string[];
  bio?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  const { error } = await supabase
    .from("alumni_trainers")
    .update({
      preferred_areas: formData.preferredAreas,
      preferred_time_slots: formData.preferredTimeSlots,
      bio: formData.bio || null,
      spot_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateSpotStatus(status: "active" | "inactive" | "paused") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  const { error } = await supabase
    .from("alumni_trainers")
    .update({
      spot_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
