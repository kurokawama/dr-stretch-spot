/**
 * Get today's date in JST (Asia/Tokyo) as YYYY-MM-DD string.
 * This avoids UTC issues when running on Vercel servers.
 */
export function getTodayJST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/**
 * Get tomorrow's date in JST as YYYY-MM-DD string.
 */
export function getTomorrowJST(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/**
 * Get a date N days ago in JST as YYYY-MM-DD string.
 */
export function getDaysAgoJST(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/**
 * Get the first day of the current month in JST as YYYY-MM-DD string.
 */
export function getMonthStartJST(): string {
  const now = new Date();
  const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, "0")}-01`;
}
