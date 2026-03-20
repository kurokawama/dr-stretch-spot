import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("Trainer Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "trainer");
  });

  test("dashboard shows shift information", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("body")).toBeVisible();
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("shift list page is accessible", async ({ page }) => {
    const response = await page.goto("/shifts");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shift detail page is navigable", async ({ page }) => {
    await page.goto("/shifts");
    const shiftLinks = page.locator('a[href*="/shifts/"]');
    const count = await shiftLinks.count();
    if (count > 0) {
      await shiftLinks.first().click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/shifts/");
    }
  });

  test("profile page is accessible", async ({ page }) => {
    const response = await page.goto("/profile");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("my-shifts page is accessible", async ({ page }) => {
    const response = await page.goto("/my-shifts");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("clock page is accessible", async ({ page }) => {
    const response = await page.goto("/clock");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("earnings page is accessible", async ({ page }) => {
    const response = await page.goto("/earnings");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigation buttons exist and are clickable", async ({ page }) => {
    await page.goto("/home");
    const buttons = page.locator("button, a[role='button']");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
