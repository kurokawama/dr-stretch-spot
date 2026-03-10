import { messagingApi } from "@line/bot-sdk";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
};

function getClient(): messagingApi.MessagingApiClient {
  if (!config.channelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }
  return new messagingApi.MessagingApiClient(config);
}

/**
 * Send a push message to a user by LINE userId
 */
export async function pushMessage(
  to: string,
  messages: messagingApi.Message[]
): Promise<void> {
  const client = getClient();
  await client.pushMessage({ to, messages });
}

/**
 * Reply to a webhook event using replyToken
 */
export async function replyMessage(
  replyToken: string,
  messages: messagingApi.Message[]
): Promise<void> {
  const client = getClient();
  await client.replyMessage({ replyToken, messages });
}
