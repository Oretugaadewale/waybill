import { expect, open, test } from "../support";

test.describe("the rest of the site", () => {
  test("main pages fit a phone screen without sideways scrolling @mobile", async ({
    page,
  }) => {
    for (const path of ["/", "/quote", "/book", "/track/WB-3150-CA"]) {
      await open(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });

  test("the header links reach every public page", async ({ page }) => {
    await open(page, "/track/WB-1042-US");
    const nav = page.getByRole("navigation", { name: "Main" });

    await nav.getByRole("link", { name: "Get a quote" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "What will it cost?",
    );

    await nav.getByRole("link", { name: "Book a shipment" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Book a shipment");

    await nav.getByRole("link", { name: "Track" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Where is my package?",
    );
  });

  test("keyboard users can skip straight to the content", async ({ page }) => {
    await open(page, "/quote");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("an unknown address shows a helpful not-found page", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This page does not exist" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Go to tracking" }).click();
    await expect(page.getByLabel("Tracking number")).toBeVisible();
  });

  test("a payment link for a booking that does not exist is not found", async ({
    page,
  }) => {
    await open(page, "/pay/not-a-reference");
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "This page does not exist" }),
    ).toBeVisible();
  });

  test("the admin area says plainly when there is no database", async ({ page }) => {
    await open(page, "/admin");
    await expect(
      page.getByText("The database is not connected, so the admin area is unavailable."),
    ).toBeVisible();
  });

  test("the payment health check reports what is missing without leaking values", async ({
    request,
  }) => {
    const response = await request.get("/api/health/payments");
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toMatchObject({
      database: "missing",
      paystackSecretKey: "missing",
      serverKey: "missing",
    });
  });

  test("the Paystack webhook refuses to work when payments are not set up", async ({
    request,
  }) => {
    const response = await request.post("/api/paystack/webhook", {
      data: { event: "charge.success", data: { reference: "BK-ABC123-0123456789ab" } },
    });
    expect(response.status()).toBe(503);
  });
});
