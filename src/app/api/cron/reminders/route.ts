import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  preDayReminderEmail,
  dayReminderEmail,
} from "@/lib/notifications";

/**
 * Cron endpoint for sending reminders
 * - Pre-day reminders: sent at 18:00 JST for tomorrow's shifts
 * - Day-of reminders: sent at 07:00 JST for today's shifts
 *
 * Vercel Cron config in vercel.json:
 * { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9,22 * * *" }] }
 * Note: Vercel Cron uses UTC. JST = UTC+9, so 18:00 JST = 09:00 UTC, 07:00 JST = 22:00 UTC (previous day)
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
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;

  let sentCount = 0;
  const errors: string[] = [];

  if (jstHour >= 17 && jstHour <= 19) {
    // Pre-day reminder (18:00 JST window)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: records } = await admin
      .from("attendance_records")
      .select(
        "*, trainer:alumni_trainers(full_name, email, auth_user_id), store:stores(name, address), application:shift_applications(id, pre_day_reminder_sent)"
      )
      .eq("shift_date", tomorrowStr)
      .eq("status", "scheduled");

    for (const record of records ?? []) {
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
        // Mark as sent
        await admin
          .from("shift_applications")
          .update({ pre_day_reminder_sent: true })
          .eq("id", record.application?.id ?? "");

        // Log notification
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
          `Failed to send to ${record.trainer.email}: ${result.error}`
        );
      }
    }
  }

  if (jstHour >= 6 && jstHour <= 8) {
    // Day-of reminder (07:00 JST window)
    const today = now.toISOString().split("T")[0];

    const { data: records } = await admin
      .from("attendance_records")
      .select(
        "*, trainer:alumni_trainers(full_name, email, auth_user_id), store:stores(name, address), application:shift_applications(id, day_reminder_sent)"
      )
      .eq("shift_date", today)
      .eq("status", "scheduled");

    for (const record of records ?? []) {
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
          `Failed to send to ${record.trainer.email}: ${result.error}`
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
    jstHour,
    sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
