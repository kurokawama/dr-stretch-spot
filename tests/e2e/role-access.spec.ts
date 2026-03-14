import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Role-based access control", () => {
  test("trainer cannot access /store and redirects to /home", async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/store");
    await page.waitForURL("**/home");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("trainer cannot access /hr and redirects to /home", async ({ page }) => {
    await loginAs(page, "trainer");
    await page.goto("/hr");
    await page.waitForURL("**/home");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("store cannot access /hr and redirects to /store", async ({ page }) => {
    await loginAs(page, "store");
    await page.goto("/hr");
    await page.waitForURL("**/store");
    await expect(page).toHaveURL(/\/store$/);
  });

  test("hr cannot access /store and redirects to /hr", async ({ page }) => {
    await loginAs(page, "hr");
    await page.goto("/store");
    await page.waitForURL("**/hr");
    await expect(page).toHaveURL(/\/hr$/);
  });

  test("each role lands on the correct page after demo login", async ({ page }) => {
    await loginAs(page, "trainer");
    await expect(page).toHaveURL(/\/home$/);

    await loginAs(page, "store");
    await expect(page).toHaveURL(/\/store$/);

    await loginAs(page, "hr");
    await expect(page).toHaveURL(/\/hr$/);
  });
});
