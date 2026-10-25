import { test, expect } from "@playwright/test";

test.describe("Storefront Product Browsing & Cart E2E Journey", () => {
  test("Guest can browse catalog, filter by category, and add items to shopping cart", async ({
    page,
  }) => {
    // 1. Visit storefront homepage
    await page.goto("/");
    await expect(page).toHaveTitle(/3D Print Store|FABRIC3D/);

    // 2. Verify Ready-to-Print 3D Catalog is rendered
    const catalogHeading = page.locator("h2", { hasText: "Ready-to-Print 3D Catalog" });
    await expect(catalogHeading).toBeVisible();

    // 3. Test Category Filter Buttons
    const roboticsFilter = page.locator("button", { hasText: "Robotics" });
    await expect(roboticsFilter).toBeVisible();
    await roboticsFilter.click();

    // Verify filtered product is displayed
    const gripperCard = page.locator("h4", { hasText: "Adaptive Soft-Robotics Gripper Claw" });
    await expect(gripperCard).toBeVisible();

    // 4. Add product to cart
    const addToCartButton = page
      .locator("div")
      .filter({ has: gripperCard })
      .locator("button", { hasText: /Add to Cart|Added/ })
      .first();

    await addToCartButton.click();
    await expect(addToCartButton).toContainText("Added");

    // 5. Verify Shopping Cart Slide-over opened automatically upon add-to-cart
    const cartHeader = page.locator("h3", { hasText: "Your Print Cart" });
    await expect(cartHeader).toBeVisible();

    // Verify item is present in cart
    await expect(page.getByText("Adaptive Soft-Robotics Gripper Claw").first()).toBeVisible();

    // 6. Proceed to Checkout CTA
    const checkoutButton = page.locator("button", { hasText: /Proceed to (Razorpay )?Checkout/ });
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // Verify navigation to /checkout
    await expect(page).toHaveURL(/\/checkout/);
  });
});
