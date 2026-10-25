import { test, expect } from "@playwright/test";

test.describe("Authentication & Route Protection E2E Journey", () => {
  test("Login page renders properly with validation and registration links", async ({
    page,
  }) => {
    await page.goto("/login");

    // Verify Login page title and elements
    await expect(page.locator("h1")).toContainText(/Sign In|Welcome/);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify link to registration
    const registerLink = page.locator('a[href*="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator("h1")).toContainText(/Create|Account/);
  });

  test("Forgot password flow renders reset password email request form", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("Unauthenticated access to protected /account route redirects to /login", async ({
    page,
  }) => {
    await page.goto("/account");

    // Client-side guard in account page redirects unauthenticated visitors to login
    await expect(page).toHaveURL(/\/login/);
  });
});
