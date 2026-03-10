"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushMessage } from "@/lib/line/client";
import { offerNotification } from "@/lib/line/templates";
import type { ActionResult } from "@/types/database";
import { randomBytes } from "crypto";

// =============================================
// Generate Link Token
// =============================================

/**
 * Generate a one-time token for LINE account linking.
 * Trainer initiates linking from the web app, gets a token to pass to LINE.
 */
export async function generateLinkToken(
  trainerId: string
): Promise<ActionResult<{ token: string; expires_at: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Verify the trainer belongs to this user
  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("id", trainerId)
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };

  const admin = createAdminClient();

  // Invalidate existing unused tokens for this trainer
  await admin
    .from("line_link_tokens")
    .update({ used: true })
    .eq("trainer_id", trainerId)
    .eq("used", false);

  // Generate new token (URL-safe, 32 bytes = 43 chars base64url)
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  const { error } = await admin.from("line_link_tokens").insert({
    token,
    trainer_id: trainerId,
    expires_at: expiresAt,
    used: false,
  });

  if (error) return { success: false, error: error.message };

  return { success: true, data: { token, expires_at: expiresAt } };
}

// =============================================
// Verify and Link Account
// =============================================

/**
 * Verify a link token and associate the LINE userId with the trainer.
 * Called from the webhook handler when a user follows with a link token.
 */
export async function verifyAndLinkAccount(
  token: string,
  lineUserId: string
): Promise<ActionResult<{ trainer_id: string }>> {
  const admin = createAdminClient();

  // Find valid, unused, unexpired token
  const { data: linkToken, error: tokenError } = await admin
    .from("line_link_tokens")
    .select("id, trainer_id, expires_at, used")
    .eq("token", token)
    .eq("used", false)
    .single();

  if (tokenError || !linkToken) {
    return { success: false, error: "無効なリンクトークンです" };
  }

  // Check expiry
  if (new Date(linkToken.expires_at) < new Date()) {
    return { success: false, error: "リンクトークンの有効期限が切れています" };
  }

  // Check if this LINE user is already linked to another trainer
  const { data: existingTrainer } = await admin
    .from("alumni_trainers")
    .select("id")
    .eq("line_user_id", lineUserId)
    .single();

  if (existingTrainer) {
    return { success: false, error: "このLINEアカウントは既に別のトレーナーに紐付いています" };
  }

  // Mark token as used
  await admin
    .from("line_link_tokens")
    .update({ used: true })
    .eq("id", linkToken.id);

  // Update trainer with LINE userId
  const { error: updateError } = await admin
    .from("alumni_trainers")
    .update({
      line_user_id: lineUserId,
      line_linked_at: new Date().toISOString(),
    })
    .eq("id", linkToken.trainer_id);

  if (updateError) return { success: false, error: updateError.message };

  return { success: true, data: { trainer_id: linkToken.trainer_id } };
}

// =============================================
// Unlink LINE Account
// =============================================

/**
 * Remove LINE association from the current user's trainer profile.
 */
export async function unlinkLineAccount(): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id, line_user_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };
  if (!trainer.line_user_id) return { success: false, error: "LINE連携されていません" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("alumni_trainers")
    .update({
      line_user_id: null,
      line_linked_at: null,
    })
    .eq("id", trainer.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// =============================================
// Get LINE Status
// =============================================

/**
 * Get LINE linking status for the current user.
 */
export async function getLineStatus(): Promise<
  ActionResult<{ linked: boolean; linked_at: string | null }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("line_user_id, line_linked_at")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };

  return {
    success: true,
    data: {
      linked: !!trainer.line_user_id,
      linked_at: trainer.line_linked_at,
    },
  };
}

// =============================================
// Send LINE Offer Notification
// =============================================

/**
 * Send an offer notification via LINE push message.
 * Only sends if the trainer has a linked LINE account.
 */
export async function sendLineOfferNotification(
  offerId: string
): Promise<ActionResult> {
  const admin = createAdminClient();

  // Get offer with store and trainer info
  const { data: offer, error: offerError } = await admin
    .from("shift_offers")
    .select("id, title, shift_date, start_time, end_time, offered_rate, trainer_id, store_id")
    .eq("id", offerId)
    .single();

  if (offerError || !offer) {
    return { success: false, error: "オファーが見つかりません" };
  }

  // Get trainer's LINE userId
  const { data: trainer } = await admin
    .from("alumni_trainers")
    .select("id, line_user_id")
    .eq("id", offer.trainer_id)
    .single();

  if (!trainer?.line_user_id) {
    // Trainer has no LINE linked — skip silently
    return { success: true };
  }

  // Get store name
  const { data: store } = await admin
    .from("stores")
    .select("name")
    .eq("id", offer.store_id)
    .single();

  const storeName = store?.name ?? "店舗";

  // Build and send Flex Message
  const message = offerNotification({
    id: offer.id,
    title: offer.title,
    store_name: storeName,
    shift_date: offer.shift_date,
    start_time: offer.start_time,
    end_time: offer.end_time,
    offered_rate: offer.offered_rate,
  });

  try {
    await pushMessage(trainer.line_user_id, [message]);

    // Log the notification
    await admin.from("line_notifications").insert({
      trainer_id: trainer.id,
      line_user_id: trainer.line_user_id,
      message_type: "offer_notification",
      reference_id: offer.id,
      status: "sent",
    });

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "LINE送信に失敗しました";
    console.error("[LINE] Push message failed:", err);

    // Log the failure
    await admin.from("line_notifications").insert({
      trainer_id: trainer.id,
      line_user_id: trainer.line_user_id,
      message_type: "offer_notification",
      reference_id: offer.id,
      status: "failed",
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}
