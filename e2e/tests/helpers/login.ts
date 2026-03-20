import type { Page } from "@playwright/test";

// Test accounts created in Supabase (password: TestPass123!)
const TEST_ACCOUNTS: Record<string, { email: string; password: string; loginPath: string; expectedPath: string }> = {
  trainer: {
    email: "test-trainer@spot-e2e.com",
    password: "TestPass123!",
    loginPath: "/login",
    expectedPath: "/home",
  },
  store_manager: {
    email: "test-store@spot-e2e.com",
    password: "TestPass123!",
    loginPath: "/login/store",
    expectedPath: "/store",
  },
  hr: {
    email: "test-hr@spot-e2e.com",
    password: "TestPass123!",
    loginPath: "/login/hr",
    expectedPath: "/hr",
  },
  admin: {
    email: "test-admin@spot-e2e.com",
    password: "TestPass123!",
    loginPath: "/login/admin",
    expectedPath: "/admin",
  },
};

/**
 * Login as a specific role using email + password form
 */
export async function loginAsRole(page: Page, role: string): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  if (!account) throw new Error(`Unknown role: ${role}`);

  await page.goto(account.loginPath);
  await page.waitForLoadState("networkidle");

  // Fill email
  const emailInput = page.locator("input[type='email']");
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(account.email);

  // Fill password
  const passwordInput = page.locator("input[type='password']");
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(account.password);

  // Submit
  await page.locator("button[type='submit']").click();

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
}

export { TEST_ACCOUNTS };
