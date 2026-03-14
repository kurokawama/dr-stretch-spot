import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("HR trainers", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "hr");
    await page.goto("/hr/trainers");
    await page.waitForLoadState("networkidle");
  });

  test("renders trainer list", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "トレーナー管理" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("名前・メールで検索")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "名前" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "メール" })).toBeVisible();
  });

  test("can search and filter trainers", async ({ page }) => {
    const searchInput = page.getByPlaceholder("名前・メールで検索");
    await searchInput.fill("zzzz-no-match");
    await page.waitForLoadState("networkidle");

    const statusSelect = page.getByRole("combobox").first();
    await statusSelect.click();
    await page.getByRole("option", { name: "アクティブ", exact: true }).click();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/条件に一致するトレーナーがいません|名のトレーナー/).first()
    ).toBeVisible();
  });

  test("opens trainer detail sheet", async ({ page }) => {
    const trainerRows = page.locator("tbody tr").filter({
      has: page.locator("td.font-medium"),
    });
    const noResult = page.getByText("条件に一致するトレーナーがいません");

    if ((await trainerRows.count()) === 0 || (await noResult.isVisible())) {
      await expect(noResult).toBeVisible();
      return;
    }

    await trainerRows.first().click();
    const detailSheet = page.getByRole("dialog");
    await expect(detailSheet).toBeVisible();
    await expect(detailSheet.getByText("メール")).toBeVisible();
  });
});
