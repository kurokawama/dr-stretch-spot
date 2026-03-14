import { type Page } from "@playwright/test";

/**
 * Demo login via API route (development only)
 * Uses /api/auth/demo-login?role=xxx to authenticate
 */
export async function loginAs(
  page: Page,
  role: "trainer" | "store" | "hr" | "admin"
) {
  // Navigate to demo login endpoint — it sets cookies and redirects
  await page.goto(`/api/auth/demo-login?role=${role}`);
  // Wait for the redirect to complete
  await page.waitForLoadState("networkidle");
}

/**
 * Expected landing pages after login by role
 */
export const LANDING_PAGES: Record<string, string> = {
  trainer: "/home",
  store: "/store",
  hr: "/hr",
  admin: "/admin",
};
