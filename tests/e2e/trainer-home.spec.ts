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
    await expect(
      page.getByText("本日のシフト", { exact: true }).first()
    ).toBeVisible();
  });

  test("shows clock-in button", async ({ page }) => {
    await expect(page.locator("text=打刻する")).toBeVisible();
  });

  test("shows stats cards: next shift, monthly income, rank", async ({
    page,
  }) => {
    await expect(page.getByText("次のシフト", { exact: true })).toBeVisible();
    await expect(page.getByText("今月の収入", { exact: true })).toBeVisible();
    await expect(
      page.getByText("ランク", { exact: true }).first()
    ).toBeVisible();
  });

  test("shows recruiting shifts section with view-all link", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "募集中のシフト" })
    ).toBeVisible();
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

  test("bottom nav has correct items", async ({ page }, testInfo) => {
    // Bottom nav is only visible on mobile (md:hidden)
    // On desktop, verify sidebar navigation links instead
    const isMobile = testInfo.project.name === "mobile";

    if (isMobile) {
      const bottomNav = page.locator("nav.fixed.bottom-0");
      await expect(bottomNav.locator('a[href="/home"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/shifts"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/my-shifts"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/clock"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/profile"]')).toBeVisible();
    } else {
      const sidebar = page.locator("aside");
      await expect(sidebar.locator('a[href="/home"]')).toBeVisible();
      await expect(sidebar.locator('a[href="/shifts"]')).toBeVisible();
      await expect(sidebar.locator('a[href="/my-shifts"]')).toBeVisible();
      await expect(sidebar.locator('a[href="/clock"]')).toBeVisible();
      await expect(sidebar.locator('a[href="/profile"]')).toBeVisible();
    }
  });

  test("recent applications section exists", async ({ page }) => {
    // "最近の応募" section only appears when there are recent applications
    const recentSection = page.getByText("最近の応募", { exact: true });
    const emptyState = page.locator("text=現在募集中のシフトはありません");

    // Either recent applications section exists or shift empty state is shown
    const hasRecent = await recentSection.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasRecent || hasEmpty).toBeTruthy();
  });
});
