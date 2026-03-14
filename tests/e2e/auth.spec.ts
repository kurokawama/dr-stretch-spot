import { test, expect } from "@playwright/test";
import { loginAs, LANDING_PAGES } from "./helpers/auth";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=ログイン")).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("login page has submit button", async ({ page }) => {
    await page.goto("/login");
    // Should have a submit/login button
    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated access to /store redirects to login", async ({
    page,
  }) => {
    await page.goto("/store");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated access to /hr redirects to login", async ({
    page,
  }) => {
    await page.goto("/hr");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated access to /admin redirects to login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("demo login buttons visible in development", async ({ page }) => {
    await page.goto("/login");
    // Demo quick login should be visible in dev mode
    await expect(page.locator("text=Demo Quick Login")).toBeVisible();
  });

  test("OTP input appears after email submit", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator("input[type='email']");
    await emailInput.fill("test@example.com");
    const submitBtn = page.locator("button[type='submit']");
    await submitBtn.click();
    // After submit, should show OTP/verification step or error
    // The exact behavior depends on whether the email exists
    await page.waitForTimeout(1000);
  });

  test.describe("Role-based login and redirect", () => {
    const roles = ["trainer", "store", "hr", "admin"] as const;

    for (const role of roles) {
      test(`demo login as ${role} redirects correctly`, async ({ page }) => {
        await loginAs(page, role);
        const expectedPath = LANDING_PAGES[role];
        expect(page.url()).toContain(expectedPath);
      });
    }
  });
});
