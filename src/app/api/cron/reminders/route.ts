import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  preDayReminderEmail,
  dayReminderEmail,
} from "@/lib/notifications";
import { pushMessage } from "@/lib/line/client";
import { reminderMessage } from "@/lib/line/templates";

/**
 * Cron endpoint for sending reminders (runs once daily at 07:00 JST / 22:00 UTC)
 * Sends both:
 * - Day-of reminders for today's shifts
 * - Pre-day reminders for tomorrow's shifts (sent evening before, but on Hobby plan
 *   we batch both into the morning run since only 1 cron/day is allowed)
 *
 * Vercel Cron config in vercel.json:
 * { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 22 * * *" }] }
 * Note: 22:00 UTC = 07:00 JST (next day)
 */
export async function GET(request: Request) {
  // Verify cron secret (required — reject if not configured)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let sentCount = 0;
  const errors: string[] = [];

  // --- Day-of reminders (today's shifts) ---
  const now = new Date();
  // Calculate JST date
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = jstDate.toISOString().split("T")[0];

  const { data: todayRecords } = await admin
    .from("attendance_records")
    .select(
      "*, trainer:alumni_trainers(full_name, email, auth_user_id), store:stores(name, address), application:shift_applications(id, day_reminder_sent)"
    )
    .eq("shift_date", today)
    .eq("status", "scheduled");

  for (const record of todayRecords ?? []) {
    if (record.application?.day_reminder_sent) continue;
    if (!record.trainer?.email) continue;

    const email = dayReminderEmail({
      trainerName: record.trainer.full_name,
      storeName: record.store?.name ?? "",
      storeAddress: record.store?.address ?? "",
      startTime: record.scheduled_start?.slice(0, 5) ?? "",
    });

    const result = await sendEmail({
      to: record.trainer.email,
      ...email,
    });

    if (result.success) {
      await admin
        .from("shift_applications")
        .update({ day_reminder_sent: true })
        .eq("id", record.application?.id ?? "");

      await admin.from("notification_logs").insert({
        user_id: record.trainer.auth_user_id,
        type: "email",
        category: "day_reminder",
        matching_id: record.application?.id ?? null,
        subject: email.subject,
        sent_at: new Date().toISOString(),
        delivered: true,
      });

      sentCount++;
    } else {
      errors.push(
        `Failed to send day reminder to ${record.trainer.email}: ${result.error}`
      );
    }
  }

  // --- Pre-day reminders (tomorrow's shifts) ---
  const tomorrowJst = new Date(jstDate);
  tomorrowJst.setDate(tomorrowJst.getDate() + 1);
  const tomorrowStr = tomorrowJst.toISOString().split("T")[0];

  const { data: tomorrowRecords } = await admin
    .from("attendance_records")
    .select(
      "*, trainer:alumni_trainers(full_name, email, auth_user_id, line_user_id), store:stores(name, address), application:shift_applications(id, pre_day_reminder_sent)"
    )
    .eq("shift_date", tomorrowStr)
    .eq("status", "scheduled");

  for (const record of tomorrowRecords ?? []) {
    if (record.application?.pre_day_reminder_sent) continue;
    if (!record.trainer?.email) continue;

    // Send email reminder
    const email = preDayReminderEmail({
      trainerName: record.trainer.full_name,
      storeName: record.store?.name ?? "",
      shiftDate: tomorrowStr,
      startTime: record.scheduled_start?.slice(0, 5) ?? "",
      endTime: record.scheduled_end?.slice(0, 5) ?? "",
      applicationId: record.application?.id ?? "",
    });

    const result = await sendEmail({
      to: record.trainer.email,
      ...email,
    });

    if (result.success) {
      await admin
        .from("shift_applications")
        .update({ pre_day_reminder_sent: true })
        .eq("id", record.application?.id ?? "");

      await admin.from("notification_logs").insert({
        user_id: record.trainer.auth_user_id,
        type: "email",
        category: "pre_day_reminder",
        matching_id: record.application?.id ?? null,
        subject: email.subject,
        sent_at: new Date().toISOString(),
        delivered: true,
      });

      sentCount++;
    } else {
      errors.push(
        `Failed to send pre-day reminder to ${record.trainer.email}: ${result.error}`
      );
    }

    // Send LINE reminder if trainer has linked LINE account
    if (record.trainer?.line_user_id) {
      try {
        const lineMessage = reminderMessage({
          application_id: record.application?.id ?? "",
          store_name: record.store?.name ?? "",
          shift_date: tomorrowStr,
          start_time: record.scheduled_start?.slice(0, 5) ?? "",
          end_time: record.scheduled_end?.slice(0, 5) ?? "",
        });

        await pushMessage(record.trainer.line_user_id, [lineMessage]);

        await admin.from("line_notifications").insert({
          trainer_id: record.trainer_id,
          line_user_id: record.trainer.line_user_id,
          message_type: "pre_day_reminder",
          reference_id: record.application?.id ?? null,
          status: "sent",
        });

        sentCount++;
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "LINE送信失敗";
        errors.push(
          `Failed to send LINE reminder to ${record.trainer.full_name}: ${errMsg}`
        );

        await admin.from("line_notifications").insert({
          trainer_id: record.trainer_id,
          line_user_id: record.trainer.line_user_id,
          message_type: "pre_day_reminder",
          reference_id: record.application?.id ?? null,
          status: "failed",
          error_message: errMsg,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    date: today,
    sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
