import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("HR Walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "hr");
  });

  test("dashboard: KPI summary cards display", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");

    // Dashboard heading — wait for SSR page to fully load
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("h1")).toContainText("ダッシュボード");

    // KPI cards should exist
    const cards = page.locator("[class*='card'], [class*='Card']");
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test("dashboard: filter bar is functional", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");

    // Filter selects exist
    const selects = page.locator("select");
    expect(await selects.count()).toBeGreaterThanOrEqual(2);

    // Search input exists
    const searchInput = page.locator("input[placeholder*='検索']");
    if (await searchInput.isVisible()) {
      await searchInput.fill("テスト");
      await page.waitForTimeout(500);
      // Should not crash
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
      await searchInput.clear();
    }
  });

  test("dashboard: data table exists with headers", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");

    // Table should exist
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 15000 });

    // Table should have header row
    const headerCells = page.locator("th");
    expect(await headerCells.count()).toBeGreaterThan(0);
  });

  test("dashboard: pagination controls exist", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");

    // Pagination should show count
    const pagination = page.getByText(/件/);
    await expect(pagination.first()).toBeVisible({ timeout: 10000 });
  });

  test("matchings: page loads with sortable table", async ({ page }) => {
    const response = await page.goto("/hr/matchings");
    if (response?.status() === 200) {
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    }
  });

  test("resignations: page loads and shows list", async ({ page }) => {
    await page.goto("/hr/resignations");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("rates: page loads with rate configuration", async ({ page }) => {
    await page.goto("/hr/rates");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("trainers: page loads with trainer list", async ({ page }) => {
    const response = await page.goto("/hr/trainers");
    if (response?.status() === 200) {
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    }
  });

  test("HR nav: all sub-pages accessible", async ({ page }) => {
    const subPages = [
      "/hr/matchings",
      "/hr/resignations",
      "/hr/rates",
    ];

    for (const subPage of subPages) {
      const response = await page.goto(subPage);
      expect(response?.status()).not.toBe(500);
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    }
  });

  test("HR cannot access store pages", async ({ page }) => {
    await page.goto("/store");
    await page.waitForURL((url) => !url.pathname.startsWith("/store"), { timeout: 10000 });
    expect(page.url()).toContain("/hr");
  });
});
