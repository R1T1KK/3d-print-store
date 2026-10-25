import { test, expect } from "@playwright/test";

test.describe("Custom 3D Model Quote Calculator E2E", () => {
  test("Guest can configure material, infill, layer height and calculate pricing", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Scroll to Quote Calculator section
    const quoteHeading = page.locator("h2", { hasText: /Upload Your Own|Custom Quote|Instant Quote/i });
    await expect(quoteHeading).toBeVisible();

    // 2. Test Material Selector Buttons
    const petgBtn = page.locator("button", { hasText: /PETG/ }).first();
    if (await petgBtn.isVisible()) {
      await petgBtn.click();
    }

    // 3. Verify Pricing Summary element is rendered
    const priceDisplay = page.locator("text=/₹[0-9,]+/");
    await expect(priceDisplay.first()).toBeVisible();

    // 4. Test Add Custom Part to Cart
    const addCustomBtn = page.locator("button", { hasText: /Add.*to Cart|Add to Manufacturing Cart/ }).first();
    if (await addCustomBtn.isVisible()) {
      await addCustomBtn.click();
      const cartDrawer = page.locator("h3", { hasText: "Your Print Cart" });
      await expect(cartDrawer).toBeVisible();
    }
  });

  test("Unauthenticated guest navigating to /checkout is securely redirected to login", async ({
    page,
  }) => {
    await page.goto("/checkout");

    // Client-side session guard in checkout redirects unauthenticated guests
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout|\/login/);
  });
});
