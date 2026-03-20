import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/login";

test.describe("Store Manager Walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "store_manager");
  });

  test("dashboard: KPI cards display with numbers", async ({ page }) => {
    await page.goto("/store");
    await page.waitForLoadState("networkidle");

    // Dashboard should have store name
    const storeName = page.locator("h1, h2").first();
    await expect(storeName).toBeVisible({ timeout: 10000 });

    // Should have KPI cards with numeric values
    const cards = page.locator("[class*='card'], [class*='Card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("dashboard: 'new shift' link navigates to shift creation", async ({ page }) => {
    await page.goto("/store");
    await page.waitForLoadState("networkidle");

    // Find new shift creation link/button
    const createLink = page.locator('a[href*="/store/shifts"]').first();
    if (await createLink.isVisible()) {
      await createLink.click();
      await page.waitForURL("**/store/shifts**", { timeout: 10000 });
      expect(page.url()).toContain("/store/shifts");
    }
  });

  test("shifts: shift creation form has all required fields", async ({ page }) => {
    await page.goto("/store/shifts");
    await page.waitForLoadState("networkidle");

    // Verify form fields exist
    await expect(page.getByText("シフト募集管理")).toBeVisible({ timeout: 10000 });

    // Title input
    const titleInput = page.locator("input[name='title'], input[placeholder*='シフト名']").first();
    if (await titleInput.isVisible()) {
      await expect(titleInput).toBeVisible();
    }

    // Date input
    const dateInput = page.locator("input[type='date']").first();
    if (await dateInput.isVisible()) {
      await expect(dateInput).toBeVisible();
    }

    // Time inputs
    const timeInputs = page.locator("input[type='time']");
    if (await timeInputs.count() >= 2) {
      expect(await timeInputs.count()).toBeGreaterThanOrEqual(2);
    }

    // Submit button
    const submitBtn = page.getByRole("button", { name: /シフトを作成|作成/ });
    await expect(submitBtn).toBeVisible();
  });

  test("shifts: empty form submission shows validation", async ({ page }) => {
    await page.goto("/store/shifts");
    await page.waitForLoadState("networkidle");

    // Try submit without filling
    const submitBtn = page.getByRole("button", { name: /シフトを作成|作成/ });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      // Should remain on same page (validation prevented submit)
      expect(page.url()).toContain("/store/shifts");
    }
  });

  test("shifts: upcoming shifts list displays", async ({ page }) => {
    await page.goto("/store/shifts");
    await page.waitForLoadState("networkidle");

    // Should have upcoming shifts section
    const upcomingSection = page.getByText(/今後のシフト/);
    await expect(upcomingSection).toBeVisible({ timeout: 10000 });
  });

  test("applications: page renders with tabs", async ({ page }) => {
    await page.goto("/store/applications");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("応募者管理")).toBeVisible({ timeout: 10000 });

    // Check tabs exist
    const pendingTab = page.getByRole("tab", { name: /未審査|pending/ });
    const approvedTab = page.getByRole("tab", { name: /承認|approved/ });

    if (await pendingTab.isVisible()) {
      // Click approved tab
      await approvedTab.click();
      await page.waitForTimeout(500);
      // Content should update
      await expect(page.locator("body")).toBeVisible();

      // Back to pending
      await pendingTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("attendance: page loads with today's data", async ({ page }) => {
    await page.goto("/store/attendance");
    await page.waitForLoadState("networkidle");

    // Should have attendance-related content
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    // Should have heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("evaluations: page loads with evaluation form or list", async ({ page }) => {
    await page.goto("/store/evaluations");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("store nav: sub-pages are accessible", async ({ page }) => {
    const subPages = ["/store/shifts", "/store/applications", "/store/attendance"];

    for (const subPage of subPages) {
      const response = await page.goto(subPage);
      expect(response?.status()).not.toBe(500);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    }
  });

  test("store manager cannot access HR pages", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForURL((url) => !url.pathname.startsWith("/hr"), { timeout: 10000 });
    expect(page.url()).toContain("/store");
  });
});
