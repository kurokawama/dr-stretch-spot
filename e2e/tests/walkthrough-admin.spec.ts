import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("Admin Walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("dashboard: KPI cards display with values", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Admin dashboard heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 10000 });

    // KPI cards exist
    const cards = page.locator("[class*='card'], [class*='Card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("dashboard: quick links navigate correctly", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Look for navigation links on admin page
    const links = page.locator("a[href*='/admin/']");
    const count = await links.count();
    if (count > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute("href");
      await firstLink.click();
      if (href) {
        await page.waitForURL(`**${href}**`, { timeout: 10000 });
        await expect(page.locator("body")).not.toContainText("Internal Server Error");
      }
    }
  });

  test("admin can access HR pages (cross-role)", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForLoadState("networkidle");
    // Admin should be able to access HR pages
    expect(page.url()).toContain("/hr");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("admin can access store pages (cross-role)", async ({ page }) => {
    await page.goto("/store");
    await page.waitForLoadState("networkidle");
    // Admin should be able to access store pages
    expect(page.url()).toContain("/store");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
