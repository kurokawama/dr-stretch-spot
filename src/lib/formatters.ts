const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const yenFormatter = new Intl.NumberFormat("ja-JP");

type DateInput = string | Date | null | undefined;

function parseDateInput(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateJP(value: DateInput): string {
  const parsed = parseDateInput(value);
  return parsed ? dateFormatter.format(parsed) : "-";
}

export function formatDateTimeJP(value: DateInput): string {
  const parsed = parseDateInput(value);
  return parsed ? dateTimeFormatter.format(parsed) : "-";
}

export function formatTimeJP(value: string | null | undefined): string {
  if (!value) return "-";
  const normalized = value.trim();
  const hhmmMatch = normalized.match(/^(\d{2}):(\d{2})/);
  if (hhmmMatch) {
    return `${hhmmMatch[1]}:${hhmmMatch[2]}`;
  }
  return normalized;
}

export function formatShiftDateTimeRangeJP(
  shiftDate: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  return `${formatDateJP(shiftDate)} ${formatTimeJP(startTime)} - ${formatTimeJP(endTime)}`;
}

export function formatYen(value: number | null | undefined): string {
  const amount = value ?? 0;
  return `¥${yenFormatter.format(amount)}`;
}

export function formatHoursFromMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-";
  const hours = minutes / 60;
  const normalized = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${normalized}h`;
}

export function formatCurrentTimeJP(now: Date): string {
  return now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
