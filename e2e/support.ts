import { expect, test as base, type Page } from "@playwright/test";

/**
 * Every test fails if the page throws an uncaught error, so a broken
 * client component cannot hide behind a page that still renders.
 */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Opens a page and waits until React has hydrated it. Before that, a
 * choice made in a select can be wiped when React takes over the page.
 */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The booking form ignores anything sent within 3 seconds of opening it. */
export const BOT_CHECK_MS = 3_200;

/** Turns "₦52,406.25" on screen into a number, whatever spacing the ₦ sign has. */
export function naira(text: string): number {
  const match = text.replace(/\s/g, "").match(/₦?([\d,]+(?:\.\d+)?)/);
  if (!match) throw new Error(`No naira amount in "${text}"`);
  return Number(match[1].replace(/,/g, ""));
}

export async function totalToPay(page: Page, regionName: string | RegExp) {
  const region = page.getByRole(regionName === "Price" ? "complementary" : "region", {
    name: regionName,
  });
  const total = region.getByText("Total to pay").locator("xpath=following-sibling::*[1]");
  return naira(await total.innerText());
}
