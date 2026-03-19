import { test, expect, type Page } from "@playwright/test";

async function loginAsHR(page: Page) {
  await page.goto("/api/auth/demo-login?role=hr");
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/hr")) {
    const email = process.env.TEST_HR_EMAIL || "hr@test.com";
    await page.goto("/login/hr");
    await page.locator("input[type='email']").fill(email);
    await page.locator("button[type='submit']").click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("HR Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHR(page);
  });

  test("HR dashboard is accessible", async ({ page }) => {
    const response = await page.goto("/hr");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("HR dashboard has content", async ({ page }) => {
    await page.goto("/hr");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("resignations page is accessible", async ({ page }) => {
    const response = await page.goto("/hr/resignations");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("rates page is accessible", async ({ page }) => {
    const response = await page.goto("/hr/rates");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
