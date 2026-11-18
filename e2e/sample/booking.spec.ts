import type { Page } from "@playwright/test";
import { BOT_CHECK_MS, expect, open, test, totalToPay } from "../support";

const FROM_QUOTE =
  "/book?service=Air+Express&originCountry=NG&destinationCountry=GB&weightKg=2.2&collection=drop_off";

async function fillValidBooking(page: Page) {
  await page.getByLabel("Contents").fill("Ankara fabric and shea butter");
  await page.getByLabel("Number of boxes").fill("1");
  await page.getByLabel("Value in naira").fill("150000");

  const sender = page.getByRole("region", { name: "Sender" });
  await sender.getByLabel("Full name").fill("Ada Okafor");
  await sender.getByLabel("Phone").fill("0803 123 4567");
  await sender.getByLabel("Email").fill("ada@example.com");

  const receiver = page.getByRole("region", { name: "Receiver" });
  await receiver.getByLabel("Full name").fill("Tolu Adeyemi");
  await receiver.getByLabel("Phone").fill("+44 7700 900123");
  await receiver.getByLabel("City").fill("London");
  await receiver.getByLabel("Delivery address").fill("14 Brick Lane, London E1 6RF");
}

test.describe("booking a shipment", () => {
  test("an empty form points at every missing detail and keeps the route @mobile", async ({
    page,
  }) => {
    await open(page, FROM_QUOTE);
    await page.waitForTimeout(BOT_CHECK_MS);
    await page.getByRole("button", { name: /^Book for ₦/ }).click();

    const summary = page
      .getByRole("alert")
      .filter({ hasText: "Some details need fixing" });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();

    const invalid = page.locator("[aria-invalid=true]");
    await expect(invalid).toHaveCount(10);
    await expect(page.getByText("Enter the contents.")).toBeVisible();
    await expect(
      page.getByText("Enter a valid email address, like name@example.com."),
    ).toBeVisible();

    // The choices from the quote survive the failed submit.
    await expect(page.getByLabel("Ships to")).toHaveValue("GB");
    await expect(page.getByLabel("Weight (kg)")).toHaveValue("2.2");
  });

  test("a form sent within seconds of opening is treated as a bot", async ({ page }) => {
    await open(page, FROM_QUOTE);
    await page.getByRole("button", { name: /^Book for ₦/ }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "We could not send your booking" }),
    ).toBeVisible();
  });

  test("the price on the button follows the weight as it changes", async ({ page }) => {
    await open(page, FROM_QUOTE);
    await expect(page.getByRole("button", { name: "Book for ₦52,406.25" })).toBeVisible();

    await page.getByLabel("Weight (kg)").fill("5");
    await expect(page.getByRole("button", { name: /^Book for ₦/ })).not.toHaveText(
      "Book for ₦52,406.25",
    );
    const total = await totalToPay(page, "Price");
    await expect(page.getByRole("button", { name: /^Book for ₦/ })).toHaveText(
      `Book for ₦${total.toLocaleString("en-NG", { minimumFractionDigits: total % 1 ? 2 : 0 })}`,
    );
  });

  test("a complete booking reaches the server, which checks it and keeps the details", async ({
    page,
  }) => {
    await open(page, FROM_QUOTE);
    await fillValidBooking(page);
    await page.waitForTimeout(BOT_CHECK_MS);
    await page.getByRole("button", { name: /^Book for ₦/ }).click();

    // Without a database this copy refuses politely instead of pretending.
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Bookings are switched off in this copy" }),
    ).toBeVisible();
    await expect(page.locator("[aria-invalid=true]")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Receiver" }).getByLabel("City"),
    ).toHaveValue("London");
    await expect(page.getByLabel("Ships to")).toHaveValue("GB");
  });
});
