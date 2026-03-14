import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Store applications", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "store");
    await page.goto("/store/applications");
    await page.waitForLoadState("networkidle");
  });

  test("renders applications list", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "応募者管理" })
    ).toBeVisible();

    await expect(page.getByRole("tab", { name: "審査待ち" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "承認済み" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "却下・キャンセル" })).toBeVisible();
  });

  test("can filter applications by status tabs", async ({ page }) => {
    const pendingTab = page.getByRole("tab", { name: "審査待ち" });
    const approvedTab = page.getByRole("tab", { name: "承認済み" });
    const historyTab = page.getByRole("tab", { name: "却下・キャンセル" });

    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute("aria-selected", "true");

    await approvedTab.click();
    await expect(approvedTab).toHaveAttribute("aria-selected", "true");

    await historyTab.click();
    await expect(historyTab).toHaveAttribute("aria-selected", "true");
  });

  test("shows trainer info in application detail area", async ({ page }) => {
    const tabs = ["審査待ち", "承認済み", "却下・キャンセル"] as const;
    let foundTrainerInfo = false;
    let foundNoDataState = false;

    for (const tabName of tabs) {
      await page.getByRole("tab", { name: tabName }).click();
      const activePanel = page.locator('[role="tabpanel"]:not([hidden])');

      const trainerInfoCount = await activePanel.getByText(/在籍\d+年/).count();
      if (trainerInfoCount > 0) {
        await expect(activePanel.getByText(/在籍\d+年/).first()).toBeVisible();
        foundTrainerInfo = true;
        break;
      }

      if ((await activePanel.getByText("該当する応募はありません").count()) > 0) {
        foundNoDataState = true;
      }
    }

    expect(foundTrainerInfo || foundNoDataState).toBeTruthy();
  });
});
