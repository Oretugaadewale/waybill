import { BOT_CHECK_MS, expect, open, test, totalToPay } from "../support";

/**
 * The whole customer journey on the deployed site: quote, book, pay on
 * Paystack's test checkout, and land on the paid booking page.
 *
 * It saves a real booking, so it only runs when E2E_ALLOW_WRITES=1. Each run
 * leaves one paid test booking named "E2E test" for the admin to decline.
 */
test.skip(
  process.env.E2E_ALLOW_WRITES !== "1",
  "Saves a booking; set E2E_ALLOW_WRITES=1 to run it",
);

test("a customer quotes, books and pays for a shipment", async ({ page }) => {
  test.setTimeout(180_000);

  await open(page, "/quote");
  await page.getByLabel("Ships to").selectOption("GB");
  await page.getByLabel("Weight (kg)").fill("1");
  const quoted = await totalToPay(page, "Your price");
  await page.getByRole("link", { name: "Book this shipment" }).click();
  await page.waitForLoadState("networkidle");
  expect(await totalToPay(page, "Price")).toBe(quoted);

  await page.getByLabel("Contents").fill("E2E test parcel, please decline");
  await page.getByLabel("Number of boxes").fill("1");
  await page.getByLabel("Value in naira").fill("1000");
  const sender = page.getByRole("region", { name: "Sender" });
  await sender.getByLabel("Full name").fill("E2E test");
  await sender.getByLabel("Phone").fill("0803 000 0000");
  await sender.getByLabel("Email").fill(process.env.E2E_EMAIL ?? "e2e@example.com");
  const receiver = page.getByRole("region", { name: "Receiver" });
  await receiver.getByLabel("Full name").fill("E2E test receiver");
  await receiver.getByLabel("Phone").fill("+44 7700 900000");
  await receiver.getByLabel("City").fill("London");
  await receiver.getByLabel("Delivery address").fill("1 Test Street, London E1 6RF");

  await page.waitForTimeout(BOT_CHECK_MS);
  await page.getByRole("button", { name: /^Book for ₦/ }).click();
  await expect(page.getByText("Booking received")).toBeVisible();

  // Paystack's hosted checkout, in test mode: choose the Success outcome.
  await page.getByRole("button", { name: /^Pay ₦.* with Paystack$/ }).click();
  await page.waitForURL(/checkout\.paystack\.com/);
  await page.getByText("Success", { exact: true }).click();
  await page.getByRole("button", { name: /^Pay NGN/ }).click();

  await page.waitForURL(/\/pay\/BK-[A-Z0-9]{6}\?result=paid/, { timeout: 60_000 });
  await expect(page.getByText("Payment received.")).toBeVisible();
  await expect(page.getByText(/Lagos office in Ojota/)).toBeVisible();
});
