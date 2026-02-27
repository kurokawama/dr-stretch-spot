"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Evaluation } from "@/types/database";

interface CreateEvaluationInput {
  application_id: string;
  rating: number;
  categories?: Record<string, number>;
  comment?: string;
}

export async function createEvaluation(
  input: CreateEvaluationInput
): Promise<ActionResult<Evaluation>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) return { success: false, error: "店舗マネージャー権限が必要です" };

  // Get application to find trainer_id
  const { data: application } = await supabase
    .from("shift_applications")
    .select("trainer_id")
    .eq("id", input.application_id)
    .single();

  if (!application) return { success: false, error: "応募情報が見つかりません" };

  // Validate rating
  if (input.rating < 1 || input.rating > 5) {
    return { success: false, error: "評価は1〜5の範囲で入力してください" };
  }

  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      application_id: input.application_id,
      trainer_id: application.trainer_id,
      store_id: manager.store_id,
      evaluator_id: manager.id,
      rating: input.rating,
      categories: input.categories ?? {},
      comment: input.comment ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Mark application as completed
  await supabase
    .from("shift_applications")
    .update({ status: "completed" })
    .eq("id", input.application_id);

  return { success: true, data };
}

export async function getTrainerEvaluations(
  trainerId: string
): Promise<ActionResult<Evaluation[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
