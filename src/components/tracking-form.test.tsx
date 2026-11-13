import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrackingForm } from "./tracking-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("TrackingForm", () => {
  beforeEach(() => push.mockReset());

  it("opens the tracking page with the number tidied up", async () => {
    const user = userEvent.setup();
    render(<TrackingForm />);

    await user.type(screen.getByLabelText("Tracking number"), " wb 1042 us ");
    await user.click(screen.getByRole("button", { name: "Track shipment" }));

    expect(push).toHaveBeenCalledWith("/track/WB-1042-US");
  });

  it("asks for a number when the box is empty", async () => {
    const user = userEvent.setup();
    render(<TrackingForm />);

    await user.click(screen.getByRole("button", { name: "Track shipment" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your tracking number.");
    expect(screen.getByLabelText("Tracking number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("explains the format when the number is malformed", async () => {
    const user = userEvent.setup();
    render(<TrackingForm />);

    await user.type(screen.getByLabelText("Tracking number"), "12345");
    await user.click(screen.getByRole("button", { name: "Track shipment" }));

    expect(screen.getByRole("alert")).toHaveTextContent("WB-1042-US");
    expect(push).not.toHaveBeenCalled();
  });
});
