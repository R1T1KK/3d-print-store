import { test, expect } from "@playwright/test";

test.describe("Admin Portal Security & Server-Side Authorization E2E", () => {
  test("Unauthenticated user navigating to /admin is redirected to login", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Middleware route guard intercepts /admin and redirects to login with return parameter
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin|\/login\?redirect=\/admin|\/login/);
  });

  test("Direct API request to /api/admin/metrics without admin session is rejected (401/403)", async ({
    request,
  }) => {
    const response = await request.get("/api/admin/metrics");
    expect([401, 403]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("Direct API request to /api/admin/jobs without admin session is rejected (401/403)", async ({
    request,
  }) => {
    const response = await request.get("/api/admin/jobs");
    expect([401, 403]).toContain(response.status());
  });

  test("Direct API request to /api/admin/orders without admin session is rejected (401/403)", async ({
    request,
  }) => {
    const response = await request.get("/api/admin/orders");
    expect([401, 403]).toContain(response.status());
  });

  test("Direct API request to /api/admin/products creation without admin session is rejected (401/403)", async ({
    request,
  }) => {
    const response = await request.post("/api/admin/products", {
      data: {
        name: "Unauthorized Hacker Part",
        basePriceInr: 50,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("Private model download signed URL endpoint rejects unauthenticated access (401/403)", async ({
    request,
  }) => {
    const response = await request.get("/api/admin/models/mock-model-uuid/download");
    expect([401, 403]).toContain(response.status());
  });
});
