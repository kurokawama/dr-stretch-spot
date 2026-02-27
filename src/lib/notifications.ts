import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@dr-stretch-spot.vercel.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dr-stretch-spot.vercel.app";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email Skip] No RESEND_API_KEY configured:", { to, subject });
    return { success: true, id: "skipped" };
  }

  try {
    const resend = getResendClient();
    if (!resend) {
      console.log("[Email Skip] Resend client not available:", { to, subject });
      return { success: true, id: "skipped" };
    }

    const { data, error } = await resend.emails.send({
      from: `Dr.stretch SPOT <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Email Error]", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email Error]", err);
    return { success: false, error: "Failed to send email" };
  }
}

// Email templates
export function matchingConfirmedEmail(params: {
  trainerName: string;
  storeName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
}) {
  return {
    subject: `【Dr.stretch SPOT】シフト確定: ${params.storeName} (${params.shiftDate})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E60012;">Dr.stretch SPOT</h2>
        <p>${params.trainerName} さん、</p>
        <p>以下のシフトが確定しました。</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>店舗:</strong> ${params.storeName}</p>
          <p><strong>日付:</strong> ${params.shiftDate}</p>
          <p><strong>時間:</strong> ${params.startTime} 〜 ${params.endTime}</p>
          <p><strong>時給:</strong> ¥${params.hourlyRate.toLocaleString()}</p>
        </div>
        <p>当日はアプリの打刻画面からQRコードを表示して、店舗スタッフに見せてください。</p>
        <p style="color: #666; font-size: 12px;">このメールは自動送信です。</p>
      </div>
    `,
  };
}

export function preDayReminderEmail(params: {
  trainerName: string;
  storeName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  applicationId: string;
}) {
  const confirmUrl = `${APP_URL}/api/confirm?id=${params.applicationId}`;
  return {
    subject: `【明日のシフト確認】${params.storeName} (${params.shiftDate})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E60012;">Dr.stretch SPOT</h2>
        <p>${params.trainerName} さん、</p>
        <p>明日のシフトのご確認をお願いします。</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>店舗:</strong> ${params.storeName}</p>
          <p><strong>日付:</strong> ${params.shiftDate}</p>
          <p><strong>時間:</strong> ${params.startTime} 〜 ${params.endTime}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${confirmUrl}" style="background: #E60012; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            OK — 出勤します
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          ボタンを押すと出勤確認が完了します。
          ご都合が悪くなった場合はアプリからキャンセルしてください。
        </p>
      </div>
    `,
  };
}

export function dayReminderEmail(params: {
  trainerName: string;
  storeName: string;
  storeAddress: string;
  startTime: string;
}) {
  return {
    subject: `【本日のシフト】${params.storeName} ${params.startTime}〜`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E60012;">Dr.stretch SPOT</h2>
        <p>${params.trainerName} さん、</p>
        <p>本日のシフトのリマインドです。</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>店舗:</strong> ${params.storeName}</p>
          <p><strong>住所:</strong> ${params.storeAddress}</p>
          <p><strong>開始:</strong> ${params.startTime}</p>
        </div>
        <p>アプリの打刻画面からQRコードを表示して、店舗スタッフに見せてください。</p>
        <p style="color: #666; font-size: 12px;">このメールは自動送信です。</p>
      </div>
    `,
  };
}
