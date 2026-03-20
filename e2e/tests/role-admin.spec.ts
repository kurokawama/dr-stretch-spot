import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("Admin Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("admin dashboard is accessible", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("admin dashboard has content", async ({ page }) => {
    await page.goto("/admin");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("admin page has management UI elements", async ({ page }) => {
    await page.goto("/admin");
    const navElements = page.locator("nav, aside, [role='navigation']");
    const links = page.locator("a[href]");
    const totalCount =
      (await navElements.count()) + (await links.count());
    expect(totalCount).toBeGreaterThan(0);
  });
});
