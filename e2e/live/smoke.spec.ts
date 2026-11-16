import { BOT_CHECK_MS, expect, open, test, totalToPay } from "../support";

/**
 * Checks against the deployed site. Nothing here writes to the database:
 * the booking test sends an incomplete form, which the server rejects before
 * saving anything. The shipment and booking below are real records; point
 * the tests at others with the environment variables if they are removed.
 */
const TRACKING_NUMBER = process.env.LIVE_TRACKING_NUMBER ?? "WB-6296-UK";
const PAID_BOOKING = process.env.LIVE_PAID_BOOKING ?? "BK-C99GGQ";

test.describe("live site", () => {
  test("payments are set up, and in Paystack test mode", async ({ request }) => {
    const response = await request.get("/api/health/payments");
    expect(response.ok()).toBe(true);
    // Fails loudly if a live key is ever put on the demo by mistake.
    expect(await response.json()).toMatchObject({
      database: "ok",
      paystackSecretKey: "ok",
      paystackMode: "test",
      serverKey: "ok",
    });
  });

  test("the home page shows real data only, no samples", async ({ page }) => {
    await open(page, "/");
    await expect(
      page.getByRole("heading", { name: "Where is my package?" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No receipt? Try a sample" }),
    ).toHaveCount(0);
  });

  test("a real shipment can be tracked from the home page", async ({ page }) => {
    await open(page, "/");
    await page.getByLabel("Tracking number").fill(TRACKING_NUMBER.toLowerCase());
    await page.getByRole("button", { name: "Track shipment" }).click();

    await expect(page).toHaveURL(new RegExp(`/track/${TRACKING_NUMBER}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: TRACKING_NUMBER }),
    ).toBeVisible();
    const scans = page
      .getByRole("region", { name: "Journey so far" })
      .getByRole("listitem");
    await expect(scans.first()).toBeVisible();
    expect(await scans.count()).toBeGreaterThan(0);
  });

  test("a sample number from the demo does not exist here", async ({ page }) => {
    await open(page, "/track/WB-1042-US");
    await expect(
      page.getByRole("heading", { name: "No shipment matches that tracking number" }),
    ).toBeVisible();
  });

  test("the live quote matches the rate card", async ({ page }) => {
    await open(page, "/quote");
    await page.getByLabel("Ships to").selectOption("GB");
    await page.getByLabel("Weight (kg)").fill("2.2");
    await expect(page.getByRole("region", { name: "Your price" })).toContainText(
      "2.5 kg",
    );
    expect(await totalToPay(page, "Your price")).toBe(52_406.25);
  });

  test("the server checks a booking before saving anything", async ({ page }) => {
    await open(
      page,
      "/book?service=Air+Express&originCountry=NG&destinationCountry=GB&weightKg=2.2&collection=drop_off",
    );
    await page.waitForTimeout(BOT_CHECK_MS);
    await page.getByRole("button", { name: /^Book for ₦/ }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Some details need fixing" }),
    ).toBeVisible();
    await expect(page.locator("[aria-invalid=true]")).toHaveCount(10);
  });

  test("a paid booking says so, and tells the customer what happens next", async ({
    page,
  }) => {
    await open(page, `/pay/${PAID_BOOKING}`);
    await expect(page.getByText(PAID_BOOKING, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Payment received.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay ₦/ })).toHaveCount(0);
  });

  test("the admin area sends signed-out visitors to the sign-in page", async ({
    page,
  }) => {
    await open(page, "/admin/bookings");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the Paystack webhook rejects a request without a valid signature", async ({
    request,
  }) => {
    const response = await request.post("/api/paystack/webhook", {
      headers: { "x-paystack-signature": "not-a-real-signature" },
      data: {
        event: "charge.success",
        data: { reference: `${PAID_BOOKING}-0123456789ab` },
      },
    });
    expect(response.status()).toBe(401);
  });
});
