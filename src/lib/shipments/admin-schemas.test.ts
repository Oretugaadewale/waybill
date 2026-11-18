import { describe, expect, it } from "vitest";
import {
  addEventSchema,
  createShipmentSchema,
  fieldErrors,
  resolveTimeZone,
  updateDetailsSchema,
} from "./admin-schemas";

const validShipment = {
  originCity: "Lagos",
  originCountry: "ng",
  originHub: "los",
  destinationCity: "Toronto",
  destinationCountry: "CA",
  destinationHub: "YYZ",
  service: "Air Express",
  carrier: "DHL Express",
  weightKg: "3.5",
  pieces: "2",
  contents: "Aso oke and shea butter",
  estimatedDelivery: "2026-11-20",
};

describe("createShipmentSchema", () => {
  it("accepts a valid shipment and tidies it", () => {
    const result = createShipmentSchema.parse(validShipment);
    expect(result).toMatchObject({
      originCountry: "NG",
      originHub: "LOS",
      weightKg: 3.5,
      pieces: 2,
    });
  });

  it("explains each problem next to its field", () => {
    const result = createShipmentSchema.safeParse({
      ...validShipment,
      originCity: " ",
      originHub: "LAGOS",
      weightKg: "0",
      pieces: "1.5",
    });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(errors.originCity).toBe("Enter the origin city.");
    expect(errors.originHub).toMatch(/three-letter/);
    expect(errors.weightKg).toMatch(/more than 0/);
    expect(errors.pieces).toMatch(/whole number/);
  });

  it("applies the route rules", () => {
    const result = createShipmentSchema.safeParse({
      ...validShipment,
      service: "Sea Freight",
      destinationCountry: "FR",
    });
    expect(fieldErrors(result.error!).destinationCountry).toMatch(/Sea freight/);
  });

  it("asks for a time zone when the origin country has several", () => {
    const result = createShipmentSchema.safeParse({
      ...validShipment,
      originCountry: "CN",
      destinationCountry: "NG",
      originTimeZone: "",
    });
    expect(fieldErrors(result.error!).originTimeZone).toMatch(/time zone/);
  });
});

describe("addEventSchema", () => {
  it("fills in a default note", () => {
    const result = addEventSchema.parse({
      stage: "at_customs",
      city: "Toronto",
      country: "CA",
      timeZone: "America/Toronto",
      occurredAt: "",
      note: "",
    });
    expect(result.note).toBe("With customs for clearance.");
  });

  it("rejects an unknown stage", () => {
    const result = addEventSchema.safeParse({ stage: "lost", city: "X", country: "NG" });
    expect(fieldErrors(result.error!).stage).toBe("Choose a stage.");
  });
});

describe("updateDetailsSchema", () => {
  it("limits weight to two decimals", () => {
    const result = updateDetailsSchema.safeParse({
      carrier: "UPS",
      weightKg: "1.234",
      pieces: "1",
      contents: "Books",
      estimatedDelivery: "2026-11-20",
    });
    expect(fieldErrors(result.error!).weightKg).toMatch(/two decimal/);
  });
});

describe("resolveTimeZone", () => {
  it("uses the only zone, or the chosen one", () => {
    expect(resolveTimeZone("NG", undefined)).toBe("Africa/Lagos");
    expect(resolveTimeZone("US", "America/Chicago")).toBe("America/Chicago");
    expect(() => resolveTimeZone("US", "Africa/Lagos")).toThrow();
  });
});
