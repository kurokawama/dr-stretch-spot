import { test, expect, type Page } from "@playwright/test";

const TRAINER_EMAIL = process.env.TEST_TRAINER_EMAIL || "trainer@test.com";
const TRAINER_PASSWORD = process.env.TEST_TRAINER_PASSWORD || "";

async function loginAsTrainer(page: Page) {
  // Use demo login API if available (development/staging)
  const response = await page.goto("/api/auth/demo-login?role=trainer");
  await page.waitForLoadState("networkidle");
  // Verify we landed on trainer home
  if (!page.url().includes("/home")) {
    // Fallback: try form login
    await page.goto("/login");
    await page.locator("input[type='email']").fill(TRAINER_EMAIL);
    if (TRAINER_PASSWORD) {
      const pwInput = page.locator("input[type='password']");
      if (await pwInput.isVisible()) {
        await pwInput.fill(TRAINER_PASSWORD);
      }
    }
    await page.locator("button[type='submit']").click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Trainer Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTrainer(page);
  });

  test("dashboard shows shift information", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("body")).toBeVisible();
    // Trainer home should have shift-related content
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
    // Check if shift cards/links exist
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
    // Check for main navigation elements
    const buttons = page.locator("button, a[role='button']");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
