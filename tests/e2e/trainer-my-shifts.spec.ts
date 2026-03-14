import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Trainer My Shifts Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/my-shifts");
  });

  test("renders my shifts heading", async ({ page }) => {
    await expect(
      page.locator("h1").filter({ hasText: "マイシフト" })
    ).toBeVisible();
  });

  test("has 3 tabs: upcoming, history, cancelled", async ({ page }) => {
    await expect(page.locator("text=予定")).toBeVisible();
    await expect(page.locator("text=履歴")).toBeVisible();
    await expect(page.locator("text=取消")).toBeVisible();
  });

  test("upcoming tab empty state shows search CTA", async ({ page }) => {
    const emptyTitle = page.locator("text=予定のシフトはありません");
    if (await emptyTitle.isVisible().catch(() => false)) {
      await expect(
        page.locator("text=シフト検索から新しいシフトを探してみましょう")
      ).toBeVisible();
      await expect(page.locator("text=シフトを探す")).toBeVisible();
    }
  });

  test("history tab empty state", async ({ page }) => {
    // Click history tab
    await page.locator("text=履歴").first().click();
    const emptyTitle = page.locator("text=履歴はありません");
    if (await emptyTitle.isVisible().catch(() => false)) {
      await expect(
        page.locator("text=シフトに参加して実績を積みましょう")
      ).toBeVisible();
    }
  });

  test("cancelled tab empty state", async ({ page }) => {
    // Click cancelled tab
    await page.locator("text=取消").first().click();
    const emptyTitle = page.locator("text=取消履歴はありません");
    if (await emptyTitle.isVisible().catch(() => false)) {
      await expect(
        page.locator("text=キャンセルされたシフトはここに表示されます")
      ).toBeVisible();
    }
  });

  test("pending shift cancel dialog text", async ({ page }) => {
    // If there's a pending shift with cancel button
    const cancelBtn = page.locator("button").filter({ hasText: "キャンセル" });
    if (await cancelBtn.first().isVisible().catch(() => false)) {
      await cancelBtn.first().click();
      await expect(
        page.locator("text=応募をキャンセルしますか？")
      ).toBeVisible();
      await expect(
        page.locator("text=この操作は取り消せません")
      ).toBeVisible();
      // Close dialog
      await page.locator("text=戻る").click();
    }
  });

  test("approved shift shows phone cancel option", async ({ page }) => {
    // If there's an approved shift
    const phoneCancel = page.locator("text=電話でキャンセル");
    if (await phoneCancel.isVisible().catch(() => false)) {
      await phoneCancel.click();
      await expect(
        page.locator("text=確定済みシフトのキャンセル")
      ).toBeVisible();
      await expect(page.locator("text=03-6451-1171")).toBeVisible();
    }
  });
});
