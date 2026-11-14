import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { emptyQuoteValues } from "@/components/quote/quote-fields";
import { QuoteCalculator } from "./quote-calculator";

describe("QuoteCalculator", () => {
  it("prices as the customer types and links to booking", async () => {
    render(<QuoteCalculator initial={emptyQuoteValues} />);
    expect(screen.getByText("Choose where it ships to.")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Ships to"), "GB");
    await userEvent.type(screen.getByLabelText(/Weight/), "2.2");

    // 2.5 kg x 18,500 + 2,500 handling + 7.5% VAT
    expect(screen.getByText("₦52,406.25")).toBeInTheDocument();
    const book = screen.getByRole("link", { name: "Book this shipment" });
    expect(book.getAttribute("href")).toContain("destinationCountry=GB");
    expect(book.getAttribute("href")).toContain("weightKg=2.2");
  });

  it("narrows sea freight to its three destinations", async () => {
    render(<QuoteCalculator initial={emptyQuoteValues} />);
    await userEvent.click(screen.getByRole("radio", { name: "Sea Freight" }));
    const options = within(screen.getByLabelText("Ships to"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual([
      "Choose a country",
      "United States",
      "Canada",
      "United Kingdom",
    ]);
  });
});
