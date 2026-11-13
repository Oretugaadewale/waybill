import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { eventsNewestFirst, findShipment } from "@/lib/shipments/tracking";
import { Timeline } from "./timeline";
import { WaybillCard } from "./waybill-card";

describe("WaybillCard", () => {
  it("shows the tracking number, status, route and estimated delivery", () => {
    render(<WaybillCard shipment={findShipment("WB-2087-NG")!} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("WB-2087-NG");
    expect(screen.getAllByText("At customs").length).toBeGreaterThan(0);
    expect(screen.getByText("LHR")).toBeInTheDocument();
    expect(screen.getByText("LOS")).toBeInTheDocument();
    expect(screen.getByText("Estimated delivery")).toBeInTheDocument();
    expect(screen.getByText("17 Nov 2026")).toBeInTheDocument();
  });

  it("reports progress to assistive technology", () => {
    render(<WaybillCard shipment={findShipment("WB-3150-CA")!} />);

    const bar = screen.getByRole("progressbar", { name: "Journey progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuetext", "Stage 3 of 6");

    const current = screen
      .getAllByRole("listitem")
      .find((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveTextContent("In transit");
  });

  it("shows the delivery date instead of the estimate once delivered", () => {
    render(<WaybillCard shipment={findShipment("WB-1042-US")!} />);

    expect(screen.getByText("Delivered on")).toBeInTheDocument();
    expect(screen.queryByText("Estimated delivery")).not.toBeInTheDocument();
  });
});

describe("Timeline", () => {
  it("lists every scan, newest first", () => {
    const shipment = findShipment("WB-1042-US")!;
    render(<Timeline events={eventsNewestFirst(shipment)} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent("Delivered");
    expect(items[0]).toHaveTextContent("9 Nov 2026, 2:47 pm");
    expect(items[5]).toHaveTextContent("Booked");
  });
});
