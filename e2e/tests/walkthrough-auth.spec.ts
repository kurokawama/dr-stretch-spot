import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("Auth & Access Control Walkthrough", () => {
  test.describe("Public pages", () => {
    test("/privacy renders without auth", async ({ page }) => {
      await page.goto("/privacy");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h1")).toContainText("プライバシーポリシー", { timeout: 10000 });
    });

    test("/terms renders without auth", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.getByText("利用規約")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Protected routes redirect unauthenticated users", () => {
    const protectedRoutes = [
      { path: "/home", redirectTo: "/login" },
      { path: "/store", redirectTo: "/login/store" },
      { path: "/hr", redirectTo: "/login/hr" },
      { path: "/admin", redirectTo: "/login/admin" },
    ];

    for (const { path, redirectTo } of protectedRoutes) {
      test(`${path} redirects to ${redirectTo}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForURL(`**${redirectTo}**`, { timeout: 10000 });
        expect(page.url()).toContain(redirectTo);
      });
    }
  });

  test.describe("Login form functionality", () => {
    test("wrong password shows error message", async ({ page }) => {
      await page.goto("/login");
      await page.locator("input[type='email']").fill("test-trainer@spot-e2e.com");
      await page.locator("input[type='password']").fill("WrongPassword123!");
      await page.locator("button[type='submit']").click();
      await page.waitForTimeout(3000);
      // Should remain on login page with error
      expect(page.url()).toContain("/login");
      // Error toast or message should appear
      const errorText = page.getByText(/正しくありません|失敗|エラー|Invalid/);
      await expect(errorText.first()).toBeVisible({ timeout: 5000 });
    });

    test("successful login redirects to dashboard", async ({ page }) => {
      await loginAsRole(page, "trainer");
      expect(page.url()).not.toContain("/login");
    });
  });

  test.describe("Role isolation", () => {
    test("trainer cannot access /store", async ({ page }) => {
      await loginAsRole(page, "trainer");
      await page.goto("/store");
      await page.waitForURL((url) => !url.pathname.startsWith("/store"), { timeout: 10000 });
      expect(page.url()).toContain("/home");
    });

    test("trainer cannot access /hr", async ({ page }) => {
      await loginAsRole(page, "trainer");
      await page.goto("/hr");
      await page.waitForURL((url) => !url.pathname.startsWith("/hr"), { timeout: 10000 });
      expect(page.url()).toContain("/home");
    });

    test("store_manager cannot access /hr", async ({ page }) => {
      await loginAsRole(page, "store_manager");
      await page.goto("/hr");
      await page.waitForURL((url) => !url.pathname.startsWith("/hr"), { timeout: 10000 });
      expect(page.url()).toContain("/store");
    });

    test("hr cannot access /store", async ({ page }) => {
      await loginAsRole(page, "hr");
      await page.goto("/store");
      await page.waitForURL((url) => !url.pathname.startsWith("/store"), { timeout: 10000 });
      expect(page.url()).toContain("/hr");
    });

    test("admin can access all areas", async ({ page }) => {
      await loginAsRole(page, "admin");

      await page.goto("/admin");
      expect(page.url()).toContain("/admin");

      await page.goto("/hr");
      expect(page.url()).toContain("/hr");

      await page.goto("/store");
      expect(page.url()).toContain("/store");
    });
  });
});
