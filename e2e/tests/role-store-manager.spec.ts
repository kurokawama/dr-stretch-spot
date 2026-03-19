import { test, expect, type Page } from "@playwright/test";

async function loginAsStoreManager(page: Page) {
  await page.goto("/api/auth/demo-login?role=store");
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/store")) {
    const email =
      process.env.TEST_STORE_MANAGER_EMAIL || "store@test.com";
    await page.goto("/login/store");
    await page.locator("input[type='email']").fill(email);
    await page.locator("button[type='submit']").click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Store Manager Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStoreManager(page);
  });

  test("store dashboard is accessible", async ({ page }) => {
    const response = await page.goto("/store");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shift creation page is accessible", async ({ page }) => {
    const response = await page.goto("/store/shifts");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("applications list is accessible", async ({ page }) => {
    const response = await page.goto("/store/applications");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("attendance page is accessible", async ({ page }) => {
    const response = await page.goto("/store/attendance");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("dashboard has shift creation button", async ({ page }) => {
    await page.goto("/store");
    const createBtn = page.locator(
      'a[href*="/store/shifts"], button:has-text("シフト")'
    );
    const count = await createBtn.count();
    expect(count).toBeGreaterThan(0);
  });
});
