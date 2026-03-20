import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("HR Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "hr");
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
