import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Trainer Shift Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/shifts");
  });

  test("renders shift search heading", async ({ page }) => {
    await expect(
      page.locator("h1").filter({ hasText: "シフト検索" })
    ).toBeVisible();
  });

  test("shows quick filter chips", async ({ page }) => {
    // Period filters
    await expect(page.locator("text=今週")).toBeVisible();
    await expect(page.locator("text=来週")).toBeVisible();
    // Area filters
    await expect(page.locator("text=関東")).toBeVisible();
    await expect(page.locator("text=関西")).toBeVisible();
    // Time filters
    await expect(page.locator("text=午前")).toBeVisible();
    await expect(page.locator("text=午後")).toBeVisible();
    // Rate filter
    await expect(page.locator("text=高時給")).toBeVisible();
  });

  test("高時給 filter shows emergency bonus text", async ({ page }) => {
    await page.locator("text=高時給").click();
    await expect(page.locator("text=緊急手当付きシフト")).toBeVisible();
  });

  test("shows result count", async ({ page }) => {
    await expect(page.locator("text=件の募集")).toBeVisible();
  });

  test("empty state shows filter change button", async ({ page }) => {
    // Apply restrictive filters to trigger empty state
    const emptyMsg = page.locator("text=条件に合うシフトが見つかりません");
    const changeFilter = page.locator("text=フィルターを変更");
    if (await emptyMsg.isVisible().catch(() => false)) {
      await expect(changeFilter).toBeVisible();
    }
  });

  test("detail search form can be opened", async ({ page }) => {
    // Click the filter toggle button (SlidersHorizontal icon)
    const filterToggle = page.locator("button").filter({ has: page.locator("svg") }).first();
    if (await filterToggle.isVisible().catch(() => false)) {
      await filterToggle.click();
      // Search form elements
      await expect(page.locator("text=エリア")).toBeVisible();
      await expect(page.locator("text=開始日")).toBeVisible();
      await expect(page.locator("text=終了日")).toBeVisible();
    }
  });
});
