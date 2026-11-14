import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({ createShipment: vi.fn() }));

import { NewShipmentForm } from "./new-shipment-form";

const optionsOf = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((o) => o.textContent)
    .filter((t) => !t?.startsWith("Choose"));

describe("NewShipmentForm", () => {
  it("offers air routes from Nigeria or China to every country", () => {
    render(<NewShipmentForm today="2026-11-14" />);
    const [origin, destination] = screen.getAllByLabelText("Country");
    expect(optionsOf(origin)).toEqual(["Nigeria", "China"]);
    expect(optionsOf(destination).length).toBeGreaterThan(200);
  });

  it("limits sea freight to Nigeria and the US, Canada and UK", async () => {
    render(<NewShipmentForm today="2026-11-14" />);
    await userEvent.selectOptions(screen.getByLabelText("Service"), "Sea Freight");
    const [origin, destination] = screen.getAllByLabelText("Country");
    expect(optionsOf(origin)).toEqual(["Nigeria"]);
    expect(optionsOf(destination)).toEqual(["United States", "Canada", "United Kingdom"]);
  });

  it("asks for a time zone only where a country has several", async () => {
    render(<NewShipmentForm today="2026-11-14" />);
    expect(screen.queryByLabelText("Time zone")).not.toBeInTheDocument();
    const [origin] = screen.getAllByLabelText("Country");
    await userEvent.selectOptions(origin, "CN");
    expect(screen.getByLabelText("Time zone")).toBeInTheDocument();
  });
});
