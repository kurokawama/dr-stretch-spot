import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=ログイン")).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("demo login buttons visible in development", async ({ page }) => {
    await page.goto("/login");
    // Demo quick login should be visible in dev mode
    await expect(page.locator("text=Demo Quick Login")).toBeVisible();
  });

  test.describe("Role-based login and redirect", () => {
    const roles = ["trainer", "store", "hr", "admin"] as const;

    for (const role of roles) {
      test(`demo login as ${role} redirects correctly`, async ({ page }) => {
        const response = await page.goto(
          `/api/auth/demo-login?role=${role}`
        );
        // Should redirect (302) or succeed
        expect(response?.status()).toBeLessThan(400);
      });
    }
  });
});
