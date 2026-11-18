import { describe, expect, it } from "vitest";
import { fieldErrors } from "@/lib/shipments/admin-schemas";
import { bookingSchema, quoteFieldsSchema, toQuoteInput } from "./schema";

const quoteFields = {
  service: "Air Express",
  originCountry: "NG",
  destinationCountry: "gb",
  weightKg: "2.2",
  length: "",
  width: "",
  height: "",
  collection: "drop_off",
};

const booking = {
  ...quoteFields,
  destinationCity: "London",
  pieces: "1",
  contents: "Aso oke fabric",
  declaredValue: "150000",
  pickupAddress: "",
  senderName: "Ada Obi",
  senderPhone: "+234 803 000 0000",
  senderEmail: "Ada@Example.com",
  receiverName: "Tunde Obi",
  receiverPhone: "+44 7700 900000",
  receiverEmail: "",
  receiverAddress: "10 Example Road, London E1 6AN",
};

describe("quoteFieldsSchema", () => {
  it("treats a blank box size as no size", () => {
    const d = quoteFieldsSchema.parse(quoteFields);
    expect(toQuoteInput(d).dimensionsCm).toBeNull();
    expect(d.destinationCountry).toBe("GB");
  });

  it("needs all three sides or none", () => {
    const r = quoteFieldsSchema.safeParse({ ...quoteFields, length: "40" });
    expect(fieldErrors(r.error!).dimensions).toMatch(/all three/);
  });

  it("caps air weight per booking", () => {
    const r = quoteFieldsSchema.safeParse({ ...quoteFields, weightKg: "800" });
    expect(fieldErrors(r.error!).weightKg).toMatch(/500 kg/);
  });
});

describe("bookingSchema", () => {
  it("accepts a complete booking and tidies the email", () => {
    const d = bookingSchema.parse(booking);
    expect(d.senderEmail).toBe("ada@example.com");
    expect(d.declaredValue).toBe(150000);
  });

  it("needs an address for pickups", () => {
    const r = bookingSchema.safeParse({ ...booking, collection: "pickup" });
    expect(fieldErrors(r.error!).pickupAddress).toMatch(/collect from/);
  });

  it("explains bad contact details", () => {
    const r = bookingSchema.safeParse({
      ...booking,
      senderPhone: "call me",
      senderEmail: "ada",
    });
    const errors = fieldErrors(r.error!);
    expect(errors.senderPhone).toMatch(/phone number/);
    expect(errors.senderEmail).toMatch(/valid email/);
  });

  it("applies the route rules through the quote", () => {
    const r = bookingSchema.safeParse({
      ...booking,
      service: "Sea Freight",
      destinationCountry: "FR",
    });
    expect(fieldErrors(r.error!).destinationCountry).toMatch(/Sea freight/);
  });
});

describe("bookingSchema messages", () => {
  it("asks for empty numbers instead of treating them as zero", () => {
    const r = bookingSchema.safeParse({ ...booking, pieces: "", declaredValue: " " });
    const errors = fieldErrors(r.error!);
    expect(errors.pieces).toBe("Enter the number of boxes.");
    expect(errors.declaredValue).toMatch(/what the goods are worth/);
  });

  it("words name errors naturally", () => {
    const r = bookingSchema.safeParse({ ...booking, senderName: "", receiverName: "A" });
    const errors = fieldErrors(r.error!);
    expect(errors.senderName).toBe("Enter the sender's full name.");
    expect(errors.receiverName).toMatch(/too short/);
  });

  it("still accepts 0 for documents", () => {
    expect(bookingSchema.parse({ ...booking, declaredValue: "0" }).declaredValue).toBe(0);
  });
});
