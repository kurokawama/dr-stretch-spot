import { validateSignature } from "@line/bot-sdk";

/**
 * Verify LINE webhook signature (HMAC-SHA256)
 * Returns true if the signature is valid
 */
export function verifyLineSignature(
  body: string,
  signature: string
): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    console.error("[LINE] LINE_CHANNEL_SECRET is not configured");
    return false;
  }
  return validateSignature(body, channelSecret, signature);
}
