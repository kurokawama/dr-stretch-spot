import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("HR dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "hr");
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");
  });

  test("renders dashboard with KPI cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /ダッシュボード/ })).toBeVisible();
    await expect(page.getByText("本日のマッチング", { exact: true })).toBeVisible();
    await expect(page.getByText("承認待ちシフト")).toBeVisible();
    await expect(page.getByText("本日の出勤状況")).toBeVisible();
    await expect(page.getByText("明日の予定")).toBeVisible();
  });

  test("has all expected HR navigation menu items", async ({ page }) => {
    const navHrefs = [
      "/hr",
      "/hr/trainers",
      "/hr/shift-offers",
      "/hr/matchings",
      "/hr/attendance",
      "/hr/resignations",
      "/hr/rates",
      "/hr/simulation",
      "/hr/audit-log",
      "/hr/blank-rules",
      "/hr/cost-ceiling",
      "/hr/rollback",
    ];

    for (const href of navHrefs) {
      await expect(page.locator(`aside a[href="${href}"]`)).toHaveCount(1);
    }
  });

  test("can reach trainers, matchings, resignations, and rates", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";

    if (isMobile) {
      await page.goto("/hr/trainers");
      await expect(
        page.getByRole("heading", { name: "トレーナー管理" })
      ).toBeVisible();

      await page.goto("/hr/matchings");
      await expect(
        page.getByRole("heading", { name: "マッチング管理" })
      ).toBeVisible();

      await page.goto("/hr/resignations");
      await expect(
        page.getByRole("heading", { name: "退職意向管理" })
      ).toBeVisible();

      await page.goto("/hr/rates");
      await expect(
        page.getByRole("heading", { name: "時給テーブル管理" })
      ).toBeVisible();
      return;
    }

    await page.locator('aside a[href="/hr/trainers"]').click();
    await expect(page).toHaveURL(/\/hr\/trainers$/);
    await expect(
      page.getByRole("heading", { name: "トレーナー管理" })
    ).toBeVisible();

    await page.locator('aside a[href="/hr/matchings"]').click();
    await expect(page).toHaveURL(/\/hr\/matchings$/);
    await expect(
      page.getByRole("heading", { name: "マッチング管理" })
    ).toBeVisible();

    await page.locator('aside a[href="/hr/resignations"]').click();
    await expect(page).toHaveURL(/\/hr\/resignations$/);
    await expect(
      page.getByRole("heading", { name: "退職意向管理" })
    ).toBeVisible();

    await page.locator('aside a[href="/hr/rates"]').click();
    await expect(page).toHaveURL(/\/hr\/rates$/);
    await expect(
      page.getByRole("heading", { name: "時給テーブル管理" })
    ).toBeVisible();
  });
});
