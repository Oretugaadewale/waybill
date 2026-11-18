/** Quote form values as strings, shared by the server pages and the client form. */
export interface QuoteFormValues {
  service: string;
  originCountry: string;
  destinationCountry: string;
  weightKg: string;
  length: string;
  width: string;
  height: string;
  collection: string;
}

export const emptyQuoteValues: QuoteFormValues = {
  service: "Air Express",
  originCountry: "NG",
  destinationCountry: "",
  weightKg: "",
  length: "",
  width: "",
  height: "",
  collection: "drop_off",
};

/** Reads quote values from URL search params, ignoring anything unexpected. */
export function quoteValuesFromParams(
  params: Record<string, string | string[] | undefined>,
): QuoteFormValues {
  const get = (key: keyof QuoteFormValues) => {
    const v = params[key];
    return typeof v === "string" ? v.slice(0, 40) : emptyQuoteValues[key];
  };
  return {
    service: get("service"),
    originCountry: get("originCountry"),
    destinationCountry: get("destinationCountry"),
    weightKg: get("weightKg"),
    length: get("length"),
    width: get("width"),
    height: get("height"),
    collection: get("collection"),
  };
}
