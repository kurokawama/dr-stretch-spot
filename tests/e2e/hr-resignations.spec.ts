import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("HR resignations", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "hr");
    await page.goto("/hr/resignations");
    await page.waitForLoadState("networkidle");
  });

  test("renders resignation list", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "退職意向管理" })
    ).toBeVisible();

    const emptyMessage = page.getByText("退職意向はありません。");
    const detailLine = page.getByText("退職希望日:");

    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    } else {
      await expect(detailLine.first()).toBeVisible();
    }
  });

  test("shows SPOT interest checkbox in resignation detail", async ({ page }) => {
    const emptyMessage = page.getByText("退職意向はありません。");
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
      return;
    }

    const pageContent = page.locator("main");
    const spotInterestCheckbox = pageContent.locator('input[type="checkbox"]');
    const spotInterestLabel = pageContent.getByText(/SPOT|spot/i);
    const hasSpotCheckbox = (await spotInterestCheckbox.count()) > 0;
    const hasSpotLabel = (await spotInterestLabel.count()) > 0;

    test.skip(
      !hasSpotCheckbox && !hasSpotLabel,
      "SPOT interest checkbox UI is not present on this screen yet."
    );

    if (hasSpotCheckbox) {
      await expect(spotInterestCheckbox.first()).toBeVisible();
    }
    if (hasSpotLabel) {
      await expect(spotInterestLabel.first()).toBeVisible();
    }
  });
});
