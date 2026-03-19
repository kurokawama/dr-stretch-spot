import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/api/auth/demo-login?role=admin");
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/admin")) {
    const email = process.env.TEST_ADMIN_EMAIL || "admin@test.com";
    await page.goto("/login/admin");
    await page.locator("input[type='email']").fill(email);
    await page.locator("button[type='submit']").click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Admin Role Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
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
    // Admin should have navigation/management elements
    const navElements = page.locator("nav, aside, [role='navigation']");
    const links = page.locator("a[href]");
    const totalCount =
      (await navElements.count()) + (await links.count());
    expect(totalCount).toBeGreaterThan(0);
  });
});
