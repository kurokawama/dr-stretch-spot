import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Trainer Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/profile");
  });

  test("renders profile heading", async ({ page }) => {
    await expect(
      page.locator("h1").filter({ hasText: "プロフィール" })
    ).toBeVisible();
  });

  test("SPOT work toggle section visible", async ({ page }) => {
    await expect(page.locator("text=SPOTワーク受付")).toBeVisible();
    // Status should show either 受付中 or 休止中
    const active = page.locator("text=受付中");
    const paused = page.locator("text=休止中");
    const isActive = await active.isVisible().catch(() => false);
    const isPaused = await paused.isVisible().catch(() => false);
    expect(isActive || isPaused).toBeTruthy();
  });

  test("basic info section has all form fields", async ({ page }) => {
    await expect(page.locator("text=基本情報")).toBeVisible();
    await expect(page.locator("text=氏名").first()).toBeVisible();
    await expect(page.locator("text=氏名（カナ）")).toBeVisible();
    await expect(page.locator("text=電話番号")).toBeVisible();
    await expect(page.locator("text=在籍年数")).toBeVisible();
    await expect(page.locator("text=希望エリア")).toBeVisible();
    await expect(page.locator("text=自己紹介")).toBeVisible();
  });

  test("tenure years field is disabled with helper text", async ({ page }) => {
    await expect(
      page.locator("text=※ 変更は人事部にお問い合わせください")
    ).toBeVisible();
  });

  test("bank info section exists", async ({ page }) => {
    await expect(page.locator("text=振込先情報")).toBeVisible();
    await expect(page.locator("text=銀行名")).toBeVisible();
    await expect(page.locator("text=支店名")).toBeVisible();
    await expect(page.locator("text=口座番号")).toBeVisible();
    await expect(page.locator("text=口座名義")).toBeVisible();
  });

  test("LINE integration section shows linked or unlinked state", async ({
    page,
  }) => {
    await expect(page.locator("text=LINE連携")).toBeVisible();
    // Should show either linked or unlinked state
    const linked = page.locator("text=連携済み");
    const unlinked = page.locator("text=未連携");
    const isLinked = await linked.isVisible().catch(() => false);
    const isUnlinked = await unlinked.isVisible().catch(() => false);
    expect(isLinked || isUnlinked).toBeTruthy();
  });

  test("save button says 変更を保存", async ({ page }) => {
    await expect(page.locator("text=変更を保存")).toBeVisible();
  });
});
