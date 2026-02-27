import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  preDayReminderEmail,
  dayReminderEmail,
} from "@/lib/notifications";

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
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
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
      "*, trainer:alumni_trainers(full_name, email, auth_user_id), store:stores(name, address), application:shift_applications(id, pre_day_reminder_sent)"
    )
    .eq("shift_date", tomorrowStr)
    .eq("status", "scheduled");

  for (const record of tomorrowRecords ?? []) {
    if (record.application?.pre_day_reminder_sent) continue;
    if (!record.trainer?.email) continue;

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
  }

  return NextResponse.json({
    success: true,
    date: today,
    sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
