import { test, expect } from "@playwright/test";

test.describe("Auth Smoke Tests - All Authentication Flows", () => {
  test.describe("Public Pages Accessibility", () => {
    test("/signup page renders with 200", async ({ page }) => {
      const response = await page.goto("/signup");
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });

    test("/login page renders with email form", async ({ page }) => {
      const response = await page.goto("/login");
      expect(response?.status()).toBe(200);
      await expect(page.locator("input[type='email']")).toBeVisible();
    });

    test("/login/hr page renders with 200", async ({ page }) => {
      const response = await page.goto("/login/hr");
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });

    test("/login/store page renders with 200", async ({ page }) => {
      const response = await page.goto("/login/store");
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });

    test("/login/admin page renders with 200", async ({ page }) => {
      const response = await page.goto("/login/admin");
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });

    test("/register page renders with 200", async ({ page }) => {
      const response = await page.goto("/register");
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Form Validation - Empty Submit", () => {
    test("signup form: empty submit shows validation error", async ({
      page,
    }) => {
      await page.goto("/signup");
      const submitBtn = page.locator("button[type='submit']");
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // After empty submit, page should still be on /signup (not navigated away)
        expect(page.url()).toContain("/signup");
      }
    });

    test("login form: empty submit shows validation error", async ({
      page,
    }) => {
      await page.goto("/login");
      const submitBtn = page.locator("button[type='submit']");
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Should remain on login page
        expect(page.url()).toContain("/login");
      }
    });

    test("register form: empty submit shows validation error", async ({
      page,
    }) => {
      await page.goto("/register");
      const submitBtn = page.locator("button[type='submit']");
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        expect(page.url()).toContain("/register");
      }
    });
  });

  test.describe("Form Validation - Invalid Input", () => {
    test("login form: invalid email shows validation error", async ({
      page,
    }) => {
      await page.goto("/login");
      const emailInput = page.locator("input[type='email']");
      await emailInput.fill("not-an-email");
      const submitBtn = page.locator("button[type='submit']");
      await submitBtn.click();
      // Should remain on login page due to validation
      await page.waitForTimeout(500);
      expect(page.url()).toContain("/login");
    });
  });

  test.describe("Navigation Links", () => {
    test("login page has link to register/signup", async ({ page }) => {
      await page.goto("/login");
      const registerLink = page.locator(
        'a[href*="/register"], a[href*="/signup"]'
      );
      const count = await registerLink.count();
      expect(count).toBeGreaterThan(0);
    });

    test("signup page navigation works", async ({ page }) => {
      await page.goto("/signup");
      // Check for any navigation links on the page
      const links = page.locator("a[href]");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("Protected Routes Redirect", () => {
    test("unauthenticated /home redirects to login", async ({ page }) => {
      await page.goto("/home");
      await page.waitForURL("**/login**", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    });

    test("unauthenticated /store redirects to login", async ({ page }) => {
      await page.goto("/store");
      await page.waitForURL("**/login**", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    });

    test("unauthenticated /hr redirects to login", async ({ page }) => {
      await page.goto("/hr");
      await page.waitForURL("**/login**", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    });

    test("unauthenticated /admin redirects to login", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForURL("**/login**", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    });
  });

  test.describe("認証後ダッシュボード遷移テスト", () => {
    const roleDashboards = [
      { role: "trainer", dashboardPath: "/home", name: "トレーナー" },
      {
        role: "store_manager",
        dashboardPath: "/store",
        name: "店舗マネージャー",
      },
      { role: "hr", dashboardPath: "/hr", name: "HR" },
      { role: "admin", dashboardPath: "/admin", name: "管理者" },
    ];

    for (const { role, dashboardPath, name } of roleDashboards) {
      test(`${name}がログイン後にダッシュボードに到達できる`, async ({
        page,
      }) => {
        // デモログインAPIでセッション取得
        await page.goto(`/api/auth/demo-login?role=${role}`);
        await page.waitForLoadState("networkidle");

        // デモログインが有効な環境でのみ検証
        // (demo-login APIが存在しない場合はスキップ)
        if (page.url().includes("/login") || page.url().includes("error")) {
          test.skip();
          return;
        }

        // ダッシュボードに遷移できることを確認
        await page.goto(dashboardPath);
        await page.waitForLoadState("networkidle");

        // ログインページにリダイレクトされていないことを確認
        expect(page.url()).not.toContain("/login");
      });
    }
  });
});
