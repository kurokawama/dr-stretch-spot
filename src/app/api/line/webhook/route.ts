import { NextResponse } from "next/server";
import { after } from "next/server";
import { messagingApi } from "@line/bot-sdk";
import { verifyLineSignature } from "@/lib/line/verify";
import { replyMessage } from "@/lib/line/client";
import { linkCompleteMessage } from "@/lib/line/templates";
import { verifyAndLinkAccount } from "@/actions/line";
import { createAdminClient } from "@/lib/supabase/admin";

// =============================================
// LINE Webhook Endpoint
// =============================================

export async function POST(request: Request) {
  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-line-signature header" },
      { status: 400 }
    );
  }

  // Verify signature
  if (!verifyLineSignature(body, signature)) {
    console.error("[LINE Webhook] Signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 403 }
    );
  }

  // Parse body
  let events: WebhookEvent[];
  try {
    const parsed = JSON.parse(body);
    events = parsed.events ?? [];
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Return 200 immediately, process events asynchronously
  after(async () => {
    for (const event of events) {
      try {
        await handleEvent(event);
      } catch (err) {
        console.error("[LINE Webhook] Event handling error:", err);
      }
    }
  });

  return NextResponse.json({ status: "ok" });
}

// =============================================
// Event Types (simplified for our use case)
// =============================================

interface WebhookEvent {
  type: string;
  replyToken?: string;
  source?: {
    type: string;
    userId?: string;
  };
  postback?: {
    data: string;
    params?: Record<string, string>;
  };
  message?: {
    type: string;
    text?: string;
  };
  follow?: {
    isUnblocked: boolean;
  };
}

// =============================================
// Helper: create a text message
// =============================================

function textMessage(text: string): messagingApi.TextMessage {
  return { type: "text", text };
}

// =============================================
// Event Router
// =============================================

async function handleEvent(event: WebhookEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;

  switch (event.type) {
    case "follow":
      await handleFollow(event, lineUserId);
      break;
    case "postback":
      await handlePostback(event, lineUserId);
      break;
    case "message":
      await handleMessage(event, lineUserId);
      break;
    default:
      break;
  }
}

// =============================================
// Follow Event Handler (Account Linking)
// =============================================

async function handleFollow(
  event: WebhookEvent,
  lineUserId: string
): Promise<void> {
  if (!event.replyToken) return;

  // Check if this LINE user is already linked
  const admin = createAdminClient();
  const { data: existingTrainer } = await admin
    .from("alumni_trainers")
    .select("id, full_name")
    .eq("line_user_id", lineUserId)
    .single();

  if (existingTrainer) {
    await replyMessage(event.replyToken, [
      textMessage(
        `${existingTrainer.full_name}\u3055\u3093\u3001\u304A\u304B\u3048\u308A\u306A\u3055\u3044\u3002Dr.stretch SPOT\u306ELINE\u901A\u77E5\u306F\u5F15\u304D\u7D9A\u304D\u6709\u52B9\u3067\u3059\u3002\n\n\u25BC Web\u30A2\u30D7\u30EA\u3092\u958B\u304F\nhttps://dr-stretch-spot.vercel.app/home`
      ),
    ]);
    return;
  }

  await replyMessage(event.replyToken, [
    textMessage(
      "Dr.stretch SPOT\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u3059\u3002\n\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A\u3059\u308B\u306B\u306F\u3001Web\u30A2\u30D7\u30EA\u306E\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u8A2D\u5B9A\u304B\u3089LINE\u9023\u643A\u3092\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002\n\n\u25BC Web\u30A2\u30D7\u30EA\u3092\u958B\u304F\nhttps://dr-stretch-spot.vercel.app/home"
    ),
  ]);
}

// =============================================
// Postback Event Handler (Accept/Decline Offer + Reminder Confirm)
// =============================================

async function handlePostback(
  event: WebhookEvent,
  lineUserId: string
): Promise<void> {
  if (!event.postback?.data) return;

  const params = new URLSearchParams(event.postback.data);
  const action = params.get("action");

  if (!action) return;

  // Route to appropriate handler
  if (action === "confirm_reminder") {
    await handleReminderConfirm(event, lineUserId, params);
    return;
  }

  // Offer accept/decline
  await handleOfferPostback(event, lineUserId, action, params);
}

// =============================================
// Reminder Confirm Handler
// =============================================

async function handleReminderConfirm(
  event: WebhookEvent,
  lineUserId: string,
  params: URLSearchParams
): Promise<void> {
  const applicationId = params.get("application_id");
  if (!applicationId) return;

  const admin = createAdminClient();

  // Verify trainer
  const { data: trainer } = await admin
    .from("alumni_trainers")
    .select("id, full_name")
    .eq("line_user_id", lineUserId)
    .single();

  if (!trainer) {
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        textMessage(
          "LINE\u9023\u643A\u304C\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002Web\u30A2\u30D7\u30EA\u304B\u3089\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A\u3092\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
        ),
      ]);
    }
    return;
  }

  // Verify application belongs to this trainer
  const { data: application } = await admin
    .from("shift_applications")
    .select("id, trainer_id, pre_day_confirmed")
    .eq("id", applicationId)
    .eq("trainer_id", trainer.id)
    .single();

  if (!application) {
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        textMessage(
          "\u30B7\u30D5\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002"
        ),
      ]);
    }
    return;
  }

  if (application.pre_day_confirmed) {
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        textMessage(
          "\u3059\u3067\u306B\u78BA\u8A8D\u6E08\u307F\u3067\u3059\u3002\u660E\u65E5\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3057\u307E\u3059\uFF01"
        ),
      ]);
    }
    return;
  }

  // Mark as confirmed
  await admin
    .from("shift_applications")
    .update({
      pre_day_confirmed: true,
      pre_day_confirmed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (event.replyToken) {
    await replyMessage(event.replyToken, [
      textMessage(
        `${trainer.full_name}\u3055\u3093\u3001\u78BA\u8A8D\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002\u660E\u65E5\u304A\u5F85\u3061\u3057\u3066\u3044\u307E\u3059\uFF01\n\n\u25BC \u6253\u523B\u753B\u9762\u3092\u958B\u304F\nhttps://dr-stretch-spot.vercel.app/clock`
      ),
    ]);
  }

  // Log the notification
  await admin.from("line_notifications").insert({
    trainer_id: trainer.id,
    line_user_id: lineUserId,
    message_type: "reminder_confirmed",
    reference_id: applicationId,
    status: "sent",
  });
}

// =============================================
// Offer Accept/Decline Handler
// =============================================

async function handleOfferPostback(
  event: WebhookEvent,
  lineUserId: string,
  action: string,
  params: URLSearchParams
): Promise<void> {
  const offerId = params.get("offer_id");
  if (!offerId) return;

  const admin = createAdminClient();
  const { data: trainer } = await admin
    .from("alumni_trainers")
    .select("id, auth_user_id")
    .eq("line_user_id", lineUserId)
    .single();

  if (!trainer) {
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        textMessage(
          "LINE\u9023\u643A\u304C\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002Web\u30A2\u30D7\u30EA\u304B\u3089\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A\u3092\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
        ),
      ]);
    }
    return;
  }

  // Verify the offer belongs to this trainer
  const { data: offer } = await admin
    .from("shift_offers")
    .select("id, trainer_id, title, status")
    .eq("id", offerId)
    .single();

  if (!offer || offer.trainer_id !== trainer.id) {
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        textMessage(
          "\u30AA\u30D5\u30A1\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002"
        ),
      ]);
    }
    return;
  }

  if (offer.status !== "pending") {
    if (event.replyToken) {
      await replyMessage(event.replyToken, [
        textMessage(
          "\u3053\u306E\u30AA\u30D5\u30A1\u30FC\u306F\u65E2\u306B\u51E6\u7406\u6E08\u307F\u3067\u3059\u3002"
        ),
      ]);
    }
    return;
  }

  const accept = action === "accept_offer";
  const result = await processOfferFromLine(
    offerId,
    accept,
    trainer.id,
    admin
  );

  if (event.replyToken) {
    let replyText: string;
    if (result.success) {
      replyText = accept
        ? `\u300C${offer.title}\u300D\u3092\u627F\u8AFE\u3057\u307E\u3057\u305F\u3002\u30B7\u30D5\u30C8\u304C\u78BA\u5B9A\u3055\u308C\u307E\u3057\u305F\u3002`
        : `\u300C${offer.title}\u300D\u3092\u8F9E\u9000\u3057\u307E\u3057\u305F\u3002`;
    } else {
      replyText = `\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${result.error}`;
    }
    await replyMessage(event.replyToken, [textMessage(replyText)]);
  }
}

// =============================================
// Message Event Handler
// =============================================

async function handleMessage(
  event: WebhookEvent,
  lineUserId: string
): Promise<void> {
  if (!event.replyToken) return;

  const messageText = event.message?.text ?? "";

  // Check if message contains a link token
  if (messageText.startsWith("link:")) {
    const token = messageText.substring(5).trim();
    if (token) {
      const result = await verifyAndLinkAccount(token, lineUserId);
      if (result.success) {
        await replyMessage(event.replyToken, [linkCompleteMessage()]);
        return;
      } else {
        await replyMessage(event.replyToken, [
          textMessage(
            `\u9023\u643A\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${result.error}`
          ),
        ]);
        return;
      }
    }
  }

  // Default response for unrecognized messages
  await replyMessage(event.replyToken, [
    textMessage(
      "Dr.stretch SPOT\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u3059\u3002\n\u30B7\u30D5\u30C8\u30AA\u30D5\u30A1\u30FC\u3084\u52E4\u52D9\u30EA\u30DE\u30A4\u30F3\u30C9\u3092\u3053\u3061\u3089\u304B\u3089\u304A\u5C4A\u3051\u3057\u307E\u3059\u3002\n\n\u25BC Web\u30A2\u30D7\u30EA\u3092\u958B\u304F\nhttps://dr-stretch-spot.vercel.app/home"
    ),
  ]);
}

// =============================================
// Process Offer from LINE (without auth context)
// =============================================

async function processOfferFromLine(
  offerId: string,
  accept: boolean,
  trainerId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<{ success: boolean; error?: string }> {
  const { data: offer } = await admin
    .from("shift_offers")
    .select("*")
    .eq("id", offerId)
    .eq("trainer_id", trainerId)
    .eq("status", "pending")
    .single();

  if (!offer)
    return {
      success: false,
      error: "\u30AA\u30D5\u30A1\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    };

  if (!accept) {
    await admin
      .from("shift_offers")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (offer.availability_id) {
      await admin
        .from("shift_availabilities")
        .update({ status: "open" })
        .eq("id", offer.availability_id);
    }

    return { success: true };
  }

  // Accept flow
  await admin
    .from("shift_offers")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId);

  if (offer.availability_id) {
    await admin
      .from("shift_availabilities")
      .update({ status: "matched" })
      .eq("id", offer.availability_id);
  }

  const isHrOffer = !offer.created_by && offer.created_by_hr_id;
  const source = isHrOffer ? "hr_offer" : "direct_offer";

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

  const { data: application, error: appError } = await admin
    .from("shift_applications")
    .insert({
      shift_request_id: shiftRequest.id,
      trainer_id: trainerId,
      confirmed_rate: offer.offered_rate,
      rate_breakdown: offer.rate_breakdown,
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: offer.created_by ?? null,
    })
    .select()
    .single();

  if (appError) return { success: false, error: appError.message };

  await admin.from("attendance_records").insert({
    application_id: application.id,
    trainer_id: trainerId,
    store_id: offer.store_id,
    shift_date: offer.shift_date,
    scheduled_start: offer.start_time,
    scheduled_end: offer.end_time,
    break_minutes: offer.break_minutes,
    status: "scheduled",
  });

  return { success: true };
}
