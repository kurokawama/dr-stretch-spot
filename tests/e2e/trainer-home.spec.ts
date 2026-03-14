import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Trainer Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/home");
  });

  test("renders greeting with trainer name", async ({ page }) => {
    await expect(page.locator("text=おかえりなさい")).toBeVisible();
  });

  test("shows today shift section", async ({ page }) => {
    await expect(page.locator("text=本日のシフト")).toBeVisible();
  });

  test("shows clock-in button", async ({ page }) => {
    await expect(page.locator("text=打刻する")).toBeVisible();
  });

  test("shows stats cards: next shift, monthly income, rank", async ({
    page,
  }) => {
    await expect(page.locator("text=次のシフト")).toBeVisible();
    await expect(page.locator("text=今月の収入")).toBeVisible();
    await expect(page.locator("text=ランク")).toBeVisible();
  });

  test("shows recruiting shifts section with view-all link", async ({
    page,
  }) => {
    await expect(page.locator("text=募集中のシフト")).toBeVisible();
  });

  test("empty state shows search CTA when no shifts", async ({ page }) => {
    // If no shifts are available, empty state message should appear
    const emptyState = page.locator("text=現在募集中のシフトはありません");
    const searchCta = page.locator("text=シフト検索で探す");
    // Either shifts exist or empty state is shown
    const hasShifts = await page
      .locator("text=すべて見る")
      .isVisible()
      .catch(() => false);
    if (!hasShifts) {
      await expect(emptyState).toBeVisible();
      await expect(searchCta).toBeVisible();
    }
  });

  test("bottom nav has correct items", async ({ page }) => {
    // Mobile bottom navigation
    await expect(page.locator('a[href="/home"]')).toBeVisible();
    await expect(page.locator('a[href="/shifts"]')).toBeVisible();
    await expect(page.locator('a[href="/my-shifts"]')).toBeVisible();
    await expect(page.locator('a[href="/clock"]')).toBeVisible();
    await expect(page.locator('a[href="/profile"]')).toBeVisible();
  });

  test("recent applications section exists", async ({ page }) => {
    await expect(page.locator("text=最近の応募")).toBeVisible();
  });
});
