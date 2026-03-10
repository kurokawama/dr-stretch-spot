import { messagingApi } from "@line/bot-sdk";

const APP_URL = "https://dr-stretch-spot.vercel.app";

// =============================================
// Design tokens for Flex Messages
// =============================================
const COLORS = {
  primary: "#1A1A1A",
  secondary: "#666666",
  accent: "#E60012",
  background: "#FFFFFF",
  surface: "#F5F5F5",
  border: "#E0E0E0",
  white: "#FFFFFF",
} as const;

// =============================================
// Offer Notification (accept/decline buttons + Web URL)
// =============================================

interface OfferParams {
  id: string;
  title: string;
  store_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  offered_rate: number;
}

export function offerNotification(
  offer: OfferParams
): messagingApi.FlexMessage {
  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "Dr.stretch SPOT",
          size: "xs",
          color: COLORS.secondary,
        },
        {
          type: "text",
          text: "\u30B7\u30D5\u30C8\u30AA\u30D5\u30A1\u30FC",
          weight: "bold",
          size: "lg",
          color: COLORS.primary,
          margin: "sm",
        },
      ],
      backgroundColor: COLORS.background,
      paddingAll: "20px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: offer.title,
          weight: "bold",
          size: "md",
          color: COLORS.primary,
          wrap: true,
        },
        {
          type: "separator",
          margin: "lg",
          color: COLORS.border,
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            infoRow("\u5E97\u8217", offer.store_name),
            infoRow("\u65E5\u4ED8", offer.shift_date),
            infoRow(
              "\u6642\u9593",
              `${offer.start_time} - ${offer.end_time}`
            ),
            infoRow(
              "\u6642\u7D66",
              `\u00A5${offer.offered_rate.toLocaleString()}`
            ),
          ],
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "md",
          action: {
            type: "postback",
            label: "\u627F\u8AFE\u3059\u308B",
            data: `action=accept_offer&offer_id=${offer.id}`,
            displayText: "\u627F\u8AFE\u3057\u307E\u3059",
          },
          color: COLORS.primary,
        },
        {
          type: "button",
          style: "secondary",
          height: "md",
          action: {
            type: "postback",
            label: "\u8F9E\u9000\u3059\u308B",
            data: `action=decline_offer&offer_id=${offer.id}`,
            displayText: "\u8F9E\u9000\u3057\u307E\u3059",
          },
          color: COLORS.surface,
        },
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "Web\u3067\u8A73\u7D30\u3092\u78BA\u8A8D",
            uri: `${APP_URL}/home`,
          },
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
  };

  return {
    type: "flex",
    altText: `\u30B7\u30D5\u30C8\u30AA\u30D5\u30A1\u30FC: ${offer.title}\uFF08${offer.store_name}\uFF09`,
    contents: bubble,
  };
}

// =============================================
// Shift Confirmation
// =============================================

interface ShiftParams {
  title: string;
  store_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  rate: number;
}

export function shiftConfirmation(
  shift: ShiftParams
): messagingApi.FlexMessage {
  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "Dr.stretch SPOT",
          size: "xs",
          color: COLORS.secondary,
        },
        {
          type: "text",
          text: "\u30B7\u30D5\u30C8\u78BA\u5B9A",
          weight: "bold",
          size: "lg",
          color: COLORS.primary,
          margin: "sm",
        },
      ],
      backgroundColor: COLORS.background,
      paddingAll: "20px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: shift.title,
          weight: "bold",
          size: "md",
          color: COLORS.primary,
          wrap: true,
        },
        {
          type: "separator",
          margin: "lg",
          color: COLORS.border,
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            infoRow("\u5E97\u8217", shift.store_name),
            infoRow("\u65E5\u4ED8", shift.shift_date),
            infoRow(
              "\u6642\u9593",
              `${shift.start_time} - ${shift.end_time}`
            ),
            infoRow(
              "\u6642\u7D66",
              `\u00A5${shift.rate.toLocaleString()}`
            ),
          ],
        },
        {
          type: "text",
          text: "\u5F53\u65E5\u306F\u30A2\u30D7\u30EA\u304B\u3089\u6253\u523B\u3092\u304A\u9858\u3044\u3057\u307E\u3059\u3002",
          size: "xs",
          color: COLORS.secondary,
          margin: "xl",
          wrap: true,
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "md",
          action: {
            type: "uri",
            label: "\u30B7\u30D5\u30C8\u3092\u78BA\u8A8D",
            uri: `${APP_URL}/my-shifts`,
          },
          color: COLORS.primary,
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
  };

  return {
    type: "flex",
    altText: `\u30B7\u30D5\u30C8\u78BA\u5B9A: ${shift.title}\uFF08${shift.store_name}\uFF09`,
    contents: bubble,
  };
}

// =============================================
// Reminder Message (day before)
// =============================================

interface ReminderParams {
  application_id: string;
  store_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}

export function reminderMessage(
  shift: ReminderParams
): messagingApi.FlexMessage {
  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "Dr.stretch SPOT",
          size: "xs",
          color: COLORS.secondary,
        },
        {
          type: "text",
          text: "\u660E\u65E5\u306E\u30B7\u30D5\u30C8",
          weight: "bold",
          size: "lg",
          color: COLORS.primary,
          margin: "sm",
        },
      ],
      backgroundColor: COLORS.background,
      paddingAll: "20px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            infoRow("\u5E97\u8217", shift.store_name),
            infoRow("\u65E5\u4ED8", shift.shift_date),
            infoRow(
              "\u6642\u9593",
              `${shift.start_time} - ${shift.end_time}`
            ),
          ],
        },
        {
          type: "text",
          text: "\u660E\u65E5\u306E\u52E4\u52D9\u3092\u304A\u9858\u3044\u3057\u307E\u3059\u3002\u5F53\u65E5\u306F\u30A2\u30D7\u30EA\u306E\u6253\u523B\u753B\u9762\u304B\u3089QR\u30B3\u30FC\u30C9\u3092\u8868\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
          size: "xs",
          color: COLORS.secondary,
          margin: "xl",
          wrap: true,
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "md",
          action: {
            type: "postback",
            label: "\u78BA\u8A8D\u3057\u307E\u3057\u305F",
            data: `action=confirm_reminder&application_id=${shift.application_id}`,
            displayText: "\u660E\u65E5\u306E\u30B7\u30D5\u30C8\u3001\u78BA\u8A8D\u3057\u307E\u3057\u305F",
          },
          color: COLORS.primary,
        },
        {
          type: "text",
          text: "\u51FA\u52E4\u304C\u96E3\u3057\u3044\u5834\u5408\u306FWeb\u30A2\u30D7\u30EA\u304B\u3089\u3054\u9023\u7D61\u304F\u3060\u3055\u3044",
          size: "xxs",
          color: COLORS.secondary,
          align: "center",
          margin: "lg",
          wrap: true,
        },
        {
          type: "button",
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "\u8A73\u7D30\u3092\u78BA\u8A8D",
            uri: `${APP_URL}/my-shifts`,
          },
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
  };

  return {
    type: "flex",
    altText: `\u660E\u65E5\u306E\u30B7\u30D5\u30C8: ${shift.store_name}\uFF08${shift.shift_date}\uFF09`,
    contents: bubble,
  };
}

// =============================================
// Link Complete Message
// =============================================

export function linkCompleteMessage(): messagingApi.FlexMessage {
  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "Dr.stretch SPOT",
          size: "xs",
          color: COLORS.secondary,
        },
        {
          type: "text",
          text: "LINE\u9023\u643A\u5B8C\u4E86",
          weight: "bold",
          size: "lg",
          color: COLORS.primary,
          margin: "sm",
        },
        {
          type: "separator",
          margin: "lg",
          color: COLORS.border,
        },
        {
          type: "text",
          text: "\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002\u30B7\u30D5\u30C8\u30AA\u30D5\u30A1\u30FC\u3084\u30EA\u30DE\u30A4\u30F3\u30C9\u3092LINE\u3067\u53D7\u3051\u53D6\u308C\u307E\u3059\u3002",
          size: "sm",
          color: COLORS.secondary,
          margin: "lg",
          wrap: true,
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "md",
          action: {
            type: "uri",
            label: "\u30A2\u30D7\u30EA\u3092\u958B\u304F",
            uri: `${APP_URL}/home`,
          },
          color: COLORS.primary,
        },
      ],
      paddingAll: "20px",
      backgroundColor: COLORS.background,
    },
  };

  return {
    type: "flex",
    altText: "LINE\u9023\u643A\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
    contents: bubble,
  };
}

// =============================================
// Helper
// =============================================

function infoRow(
  label: string,
  value: string
): messagingApi.FlexBox {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: COLORS.secondary,
        flex: 0,
      },
      {
        type: "text",
        text: value,
        size: "sm",
        color: COLORS.primary,
        align: "end",
        weight: "bold",
      },
    ],
  };
}
