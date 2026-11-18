import { expect, open, test, totalToPay } from "../support";

test.describe("getting a quote", () => {
  test("air express from Lagos to London, priced on the rounded-up weight @mobile", async ({
    page,
  }) => {
    await open(page, "/quote");
    const price = page.getByRole("region", { name: "Your price" });
    await expect(price).toContainText("Choose where it ships to.");

    await page.getByLabel("Ships to").selectOption("GB");
    await page.getByLabel("Weight (kg)").fill("2.2");

    // 2.2 kg rounds up to 2.5 kg: 2.5 x 18,500 + 2,500 handling, plus 7.5% VAT.
    await expect(price).toContainText("2.5 kg");
    await expect(price).toContainText("Air Express, 2.5 kg at ₦18,500 per kg");
    await expect(price).toContainText("3 to 5 working days");
    expect(await totalToPay(page, "Your price")).toBe(52_406.25);
  });

  test("sea freight only offers the US, Canada and UK, with a 10 kg minimum", async ({
    page,
  }) => {
    await open(page, "/quote");
    await page.getByRole("radio", { name: "Sea Freight" }).check();

    await expect(page.getByLabel("Ships to").locator("option")).toHaveText([
      "Choose a country",
      "United States",
      "Canada",
      "United Kingdom",
    ]);

    await page.getByLabel("Ships to").selectOption("US");
    await page.getByLabel("Weight (kg)").fill("4");

    const price = page.getByRole("region", { name: "Your price" });
    await expect(price).toContainText("Sea Freight, 10 kg at ₦4,800 per kg");
    await expect(price).toContainText("35 to 50 working days");
    expect(await totalToPay(page, "Your price")).toBe(54_287.5);
  });

  test("big, light boxes are charged by size", async ({ page }) => {
    await open(page, "/quote");
    await page.getByLabel("Ships to").selectOption("GB");
    await page.getByLabel("Weight (kg)").fill("2");
    await page.getByLabel("length").fill("50");
    await page.getByLabel("width").fill("40");
    await page.getByLabel("height").fill("30");

    // 50 x 40 x 30 / 5000 = 12 kg, which beats the 2 kg on the scale.
    const price = page.getByRole("region", { name: "Your price" });
    await expect(price).toContainText("Air Express, 12 kg at ₦18,500 per kg");
    await expect(price).toContainText("Box size counts as 12 kg, more than its 2 kg");
  });

  test("asking for a pickup adds the pickup fee", async ({ page }) => {
    await open(page, "/quote");
    await page.getByLabel("Ships to").selectOption("GB");
    await page.getByLabel("Weight (kg)").fill("2.2");
    const dropOff = await totalToPay(page, "Your price");

    await page.getByRole("radio", { name: /Pick it up from me/ }).check();
    const price = page.getByRole("region", { name: "Your price" });
    await expect(price).toContainText("Pickup");
    await expect.poll(() => totalToPay(page, "Your price")).toBe(dropOff + 5_000 * 1.075);
  });

  test("a weight that is not a number asks for one", async ({ page }) => {
    await open(page, "/quote");
    await page.getByLabel("Ships to").selectOption("GB");
    await page.getByLabel("Weight (kg)").fill("abc");
    await expect(page.getByRole("region", { name: "Your price" })).toContainText(
      "Enter the weight in kilograms.",
    );
    await expect(page.getByRole("link", { name: "Book this shipment" })).toHaveCount(0);
  });

  test("Book this shipment carries every choice into the booking form", async ({
    page,
  }) => {
    await open(page, "/quote");
    await page.getByLabel("Ships from").selectOption("CN");
    await page.getByLabel("Ships to").selectOption("US");
    await page.getByLabel("Weight (kg)").fill("4");
    const quoted = await totalToPay(page, "Your price");

    await page.getByRole("link", { name: "Book this shipment" }).click();
    await expect(page).toHaveURL(/\/book\?/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Ships from")).toHaveValue("CN");
    await expect(page.getByLabel("Ships to")).toHaveValue("US");
    await expect(page.getByLabel("Weight (kg)")).toHaveValue("4");
    expect(await totalToPay(page, "Price")).toBe(quoted);
  });
});
