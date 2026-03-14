import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Store dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "store");
    await page.goto("/store");
    await page.waitForLoadState("networkidle");
  });

  test("renders dashboard with key metric cards", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "ダッシュボード" })
    ).toBeVisible();
    await expect(page.getByText("本日のカバー率")).toBeVisible();
    await expect(page.getByText("未対応の応募")).toBeVisible();
    await expect(page.getByText("今月の利用回数")).toBeVisible();
  });

  test("shows expected store navigation items", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";

    if (isMobile) {
      const mobileNav = page.locator("nav.fixed.bottom-0");
      await expect(mobileNav).toBeVisible();

      const mobileLinks = mobileNav.getByRole("link");
      const mobileCount = await mobileLinks.count();
      expect(mobileCount).toBeLessThanOrEqual(5);

      await expect(mobileNav.getByRole("link", { name: "ホーム" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "シフト" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "応募者" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "出勤" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "通知" })).toBeVisible();
      return;
    }

    await expect(
      page.locator('aside a[href="/store"]', { hasText: "ダッシュボード" })
    ).toBeVisible();
    await expect(
      page.locator('aside a[href="/store/shifts"]', { hasText: "シフト募集" })
    ).toBeVisible();
    await expect(
      page.locator('aside a[href="/store/applications"]', { hasText: "応募者" })
    ).toBeVisible();
    await expect(
      page.locator('aside a[href="/store/attendance"]', { hasText: "出勤管理" })
    ).toBeVisible();
    await expect(
      page.locator('aside a[href="/store/evaluations"]', { hasText: "評価" })
    ).toBeVisible();
  });

  test("can reach shifts, applications, attendance, and evaluations", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";

    if (isMobile) {
      await page.goto("/store/shifts");
      await expect(
        page.getByRole("heading", { name: "シフト募集管理" })
      ).toBeVisible();

      await page.goto("/store/applications");
      await expect(
        page.getByRole("heading", { name: "応募者管理" })
      ).toBeVisible();

      await page.goto("/store/attendance");
      await expect(
        page.getByRole("heading", { name: "出勤管理" })
      ).toBeVisible();

      await page.goto("/store/evaluations");
      await expect(
        page.getByRole("heading", { name: "評価入力" })
      ).toBeVisible();
      return;
    }

    await page.locator('aside a[href="/store/shifts"]').click();
    await page.waitForURL(/\/store\/shifts$/);
    await expect(
      page.getByRole("heading", { name: "シフト募集管理" })
    ).toBeVisible();

    await page.locator('aside a[href="/store/applications"]').click();
    await page.waitForURL(/\/store\/applications$/);
    await expect(
      page.getByRole("heading", { name: "応募者管理" })
    ).toBeVisible();

    await page.locator('aside a[href="/store/attendance"]').click();
    await page.waitForURL(/\/store\/attendance$/);
    await expect(
      page.getByRole("heading", { name: "出勤管理" })
    ).toBeVisible();

    await page.locator('aside a[href="/store/evaluations"]').click();
    await page.waitForURL(/\/store\/evaluations$/);
    await expect(
      page.getByRole("heading", { name: "評価入力" })
    ).toBeVisible();
  });
});
