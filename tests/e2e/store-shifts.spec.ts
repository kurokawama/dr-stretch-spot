import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Store shifts", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "store");
    await page.goto("/store/shifts");
    await page.waitForLoadState("networkidle");
  });

  test("shows accessible shift creation form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "シフト募集管理" })
    ).toBeVisible();
    await expect(page.getByText("新規シフト募集")).toBeVisible();

    await expect(page.getByLabel("タイトル")).toBeVisible();
    await expect(page.getByLabel("日付")).toBeVisible();
    await expect(page.getByLabel("開始時間")).toBeVisible();
    await expect(page.getByLabel("終了時間")).toBeVisible();
    await expect(page.getByLabel("休憩（分）")).toBeVisible();
    await expect(page.getByLabel("必要人数")).toBeVisible();
    await expect(page.getByLabel("備考")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "シフト募集を作成" })
    ).toBeVisible();
  });

  test("renders shift list section", async ({ page }) => {
    await expect(page.getByText("今後のシフト")).toBeVisible();

    const shiftRows = page.locator("text=/\\d+\\/\\d+名/");
    const noShiftMessage = page.getByText("募集中のシフトはありません");

    const hasRows = (await shiftRows.count()) > 0;
    if (!hasRows) {
      await expect(noShiftMessage).toBeVisible();
    } else {
      await expect(shiftRows.first()).toBeVisible();
    }
  });

  test("can open template management page", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile";

    if (isMobile) {
      await page.goto("/store/templates");
    } else {
      await page.locator('aside a[href="/store/templates"]').click();
    }

    await expect(page).toHaveURL(/\/store\/templates$/);
    await expect(
      page.getByRole("heading", { name: "テンプレート管理" })
    ).toBeVisible();
    await expect(page.getByText("シフトテンプレート一覧")).toBeVisible();
  });
});
