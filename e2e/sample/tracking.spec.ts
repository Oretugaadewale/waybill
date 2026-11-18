import { expect, open, test } from "../support";

const SAMPLES = [
  { number: "WB-1042-US", status: "Delivered" },
  { number: "WB-2087-NG", status: "At customs" },
  { number: "WB-3150-CA", status: "In transit" },
  { number: "WB-4021-NG", status: "Out for delivery" },
  { number: "WB-5310-US", status: "Picked up" },
  { number: "WB-6604-UK", status: "Booked" },
];

test.describe("tracking a shipment", () => {
  test("a customer types their number the way it looks on a receipt @mobile", async ({
    page,
  }) => {
    await open(page, "/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Where is my package?" }),
    ).toBeVisible();

    // Lower case, spaces instead of dashes, stray spaces: all common on a phone.
    await page.getByLabel("Tracking number").fill("  wb 2087 ng ");
    await page.getByLabel("Tracking number").press("Enter");

    await expect(page).toHaveURL(/\/track\/WB-2087-NG$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "WB-2087-NG" }),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "At customs (current)" }),
    ).toBeVisible();
  });

  test("the journey lists every scan, newest first, in local time", async ({ page }) => {
    await open(page, "/track/WB-3150-CA");

    const journey = page.getByRole("region", { name: "Journey so far" });
    const scans = journey.getByRole("listitem");
    await expect(scans).toHaveCount(3);
    await expect(scans.nth(0)).toContainText("In transit");
    await expect(scans.nth(0)).toContainText(
      "local time, Murtala Muhammed Airport, Lagos",
    );
    await expect(scans.nth(2)).toContainText("Booked");

    const times = await journey
      .locator("time")
      .evaluateAll((els) =>
        els.map((el) => Date.parse(el.getAttribute("datetime") ?? "")),
      );
    expect(times.every(Number.isFinite)).toBe(true);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  for (const sample of SAMPLES) {
    test(`sample ${sample.number} shows "${sample.status}"`, async ({ page }) => {
      await open(page, "/");
      await page.getByRole("link", { name: new RegExp(`^${sample.number} `) }).click();

      await expect(page).toHaveURL(new RegExp(`/track/${sample.number}$`));
      const card = page.getByRole("article");
      await expect(card.getByRole("heading", { name: sample.number })).toBeVisible();
      await expect(card.getByText(sample.status, { exact: true }).first()).toBeVisible();
      await expect(
        page.getByRole("progressbar", { name: "Journey progress" }),
      ).toBeVisible();
    });
  }

  test("a number in the wrong format is caught before leaving the page", async ({
    page,
  }) => {
    await open(page, "/");
    await page.getByLabel("Tracking number").fill("hello");
    await page.getByRole("button", { name: "Track shipment" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Tracking numbers look like WB-1042-US.")).toBeVisible();
  });

  test("a well-formed number that does not exist explains what to do", async ({
    page,
  }) => {
    await open(page, "/track/WB-0000-XX");
    // The page streams in, so the status is already sent; noindex keeps it out of search.
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();

    await expect(
      page.getByRole("heading", { name: "No shipment matches that tracking number" }),
    ).toBeVisible();
    await expect(page.getByLabel("Tracking number")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sample tracking numbers" }),
    ).toBeVisible();
  });

  test("a lower-case link opens the shipment at its proper address", async ({ page }) => {
    await open(page, "/track/wb-3150-ca");
    await expect(page).toHaveURL(/\/track\/WB-3150-CA$/);
  });

  test("Track another shipment goes back to the search", async ({ page }) => {
    await open(page, "/track/WB-1042-US");
    await page.getByRole("link", { name: "Track another shipment" }).click();
    await expect(page.getByLabel("Tracking number")).toBeVisible();
  });
});
