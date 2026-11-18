import { describe, expect, it } from "vitest";
import { allowedNextStages, routeProblem, trackingSuffix } from "./rules";

describe("routeProblem", () => {
  it("allows air from Nigeria or China to anywhere else", () => {
    expect(routeProblem("Air Express", "NG", "JP")).toBeNull();
    expect(routeProblem("Air Economy", "CN", "NG")).toBeNull();
  });

  it("blocks air from anywhere else", () => {
    expect(routeProblem("Air Express", "GB", "NG")?.field).toBe("originCountry");
  });

  it("allows sea only from Nigeria to the US, Canada and UK", () => {
    expect(routeProblem("Sea Freight", "NG", "US")).toBeNull();
    expect(routeProblem("Sea Freight", "NG", "GB")).toBeNull();
    expect(routeProblem("Sea Freight", "NG", "DE")).toMatchObject({
      field: "destinationCountry",
      message: expect.stringContaining("United States, Canada or United Kingdom"),
    });
    expect(routeProblem("Sea Freight", "CN", "US")?.field).toBe("originCountry");
  });

  it("rejects same-country routes", () => {
    expect(routeProblem("Air Express", "NG", "NG")?.field).toBe("destinationCountry");
  });
});

describe("trackingSuffix", () => {
  it("uses the destination country, writing GB as UK", () => {
    expect(trackingSuffix("NG")).toBe("NG");
    expect(trackingSuffix("GB")).toBe("UK");
  });
});

describe("allowedNextStages", () => {
  it("only moves forward", () => {
    expect(allowedNextStages("picked_up", false)).toEqual([
      "in_transit",
      "at_customs",
      "out_for_delivery",
      "delivered",
    ]);
  });

  it("lets transit and customs repeat", () => {
    expect(allowedNextStages("in_transit", false)[0]).toBe("in_transit");
    expect(allowedNextStages("at_customs", false)[0]).toBe("at_customs");
  });

  it("stops after delivery or cancellation", () => {
    expect(allowedNextStages("delivered", false)).toEqual([]);
    expect(allowedNextStages("in_transit", true)).toEqual([]);
  });

  it("starts with booked", () => {
    expect(allowedNextStages(null, false)).toEqual(["booked"]);
  });
});
