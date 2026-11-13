import type { Shipment } from "./types";

/**
 * Invented shipments used until the database arrives in Stage 2.
 * One shipment sits at each stage so every UI state can be checked.
 * No real customers, addresses or tracking numbers.
 */
export const SAMPLE_SHIPMENTS: Shipment[] = [
  {
    trackingNumber: "WB-1042-US",
    origin: { city: "Lagos", country: "NG", hub: "LOS" },
    destination: { city: "Houston", country: "US", hub: "IAH" },
    service: "Air Express",
    carrier: "DHL Express",
    weightKg: 4.2,
    pieces: 1,
    contents: "Ankara fabric and beaded jewellery",
    estimatedDelivery: "2026-11-09",
    events: [
      {
        stage: "booked",
        at: "2026-11-02T10:14:00+01:00",
        location: "Ojota, Lagos",
        note: "Shipment booked at the Ojota drop-off centre.",
      },
      {
        stage: "picked_up",
        at: "2026-11-02T16:40:00+01:00",
        location: "Ojota, Lagos",
        note: "Collected by DHL Express.",
      },
      {
        stage: "in_transit",
        at: "2026-11-03T22:05:00+01:00",
        location: "Murtala Muhammed Airport, Lagos",
        note: "Departed Lagos on the overnight flight to Leipzig.",
      },
      {
        stage: "at_customs",
        at: "2026-11-06T09:30:00-06:00",
        location: "Houston, TX",
        note: "Arrived in the US and cleared customs.",
      },
      {
        stage: "out_for_delivery",
        at: "2026-11-09T08:12:00-06:00",
        location: "Houston, TX",
        note: "With the courier for delivery today.",
      },
      {
        stage: "delivered",
        at: "2026-11-09T14:47:00-06:00",
        location: "Houston, TX",
        note: "Delivered and signed for by T. Adeyemi.",
      },
    ],
  },
  {
    trackingNumber: "WB-2087-NG",
    origin: { city: "London", country: "GB", hub: "LHR" },
    destination: { city: "Lagos", country: "NG", hub: "LOS" },
    service: "Air Economy",
    carrier: "UPS",
    weightKg: 11.5,
    pieces: 2,
    contents: "Laptop accessories and books",
    estimatedDelivery: "2026-11-17",
    events: [
      {
        stage: "booked",
        at: "2026-11-05T11:02:00+00:00",
        location: "London",
        note: "Shipment booked online.",
      },
      {
        stage: "picked_up",
        at: "2026-11-06T13:20:00+00:00",
        location: "London",
        note: "Collected by UPS.",
      },
      {
        stage: "in_transit",
        at: "2026-11-08T19:45:00+00:00",
        location: "Heathrow Airport, London",
        note: "Departed London for Lagos.",
      },
      {
        stage: "at_customs",
        at: "2026-11-11T07:55:00+01:00",
        location: "Murtala Muhammed Airport, Lagos",
        note: "Arrived in Lagos. Waiting for customs clearance.",
      },
    ],
  },
  {
    trackingNumber: "WB-3150-CA",
    origin: { city: "Lagos", country: "NG", hub: "LOS" },
    destination: { city: "Toronto", country: "CA", hub: "YYZ" },
    service: "Air Express",
    carrier: "Aramex",
    weightKg: 6.8,
    pieces: 1,
    contents: "Shea butter and black soap",
    estimatedDelivery: "2026-11-18",
    events: [
      {
        stage: "booked",
        at: "2026-11-10T09:05:00+01:00",
        location: "Ojota, Lagos",
        note: "Shipment booked at the Ojota drop-off centre.",
      },
      {
        stage: "picked_up",
        at: "2026-11-10T15:30:00+01:00",
        location: "Ojota, Lagos",
        note: "Collected by Aramex.",
      },
      {
        stage: "in_transit",
        at: "2026-11-12T23:10:00+01:00",
        location: "Murtala Muhammed Airport, Lagos",
        note: "Departed Lagos for Toronto via Dubai.",
      },
    ],
  },
  {
    trackingNumber: "WB-4021-NG",
    origin: { city: "Houston", country: "US", hub: "IAH" },
    destination: { city: "Lagos", country: "NG", hub: "LOS" },
    service: "Air Economy",
    carrier: "DHL Express",
    weightKg: 3.1,
    pieces: 1,
    contents: "Phone and accessories",
    estimatedDelivery: "2026-11-13",
    events: [
      {
        stage: "booked",
        at: "2026-11-03T10:00:00-06:00",
        location: "Houston, TX",
        note: "Package received at the US warehouse.",
      },
      {
        stage: "picked_up",
        at: "2026-11-04T12:15:00-06:00",
        location: "Houston, TX",
        note: "Collected by DHL Express.",
      },
      {
        stage: "in_transit",
        at: "2026-11-06T18:40:00-06:00",
        location: "Houston, TX",
        note: "Departed Houston for Lagos.",
      },
      {
        stage: "at_customs",
        at: "2026-11-10T08:25:00+01:00",
        location: "Murtala Muhammed Airport, Lagos",
        note: "Cleared Nigerian customs. Duty paid.",
      },
      {
        stage: "out_for_delivery",
        at: "2026-11-13T07:50:00+01:00",
        location: "Ikeja, Lagos",
        note: "With the rider for delivery today.",
      },
    ],
  },
  {
    trackingNumber: "WB-5310-US",
    origin: { city: "Lagos", country: "NG", hub: "LOS" },
    destination: { city: "Atlanta", country: "US", hub: "ATL" },
    service: "Sea Freight",
    carrier: "Maersk",
    weightKg: 48,
    pieces: 3,
    contents: "Dried foodstuff and spices",
    estimatedDelivery: "2026-12-18",
    events: [
      {
        stage: "booked",
        at: "2026-11-11T10:30:00+01:00",
        location: "Ojota, Lagos",
        note: "Shipment booked for the next sea consolidation.",
      },
      {
        stage: "picked_up",
        at: "2026-11-12T14:00:00+01:00",
        location: "Apapa, Lagos",
        note: "Packed and loaded into the consolidation container.",
      },
    ],
  },
  {
    trackingNumber: "WB-6604-UK",
    origin: { city: "Abuja", country: "NG", hub: "ABV" },
    destination: { city: "Manchester", country: "GB", hub: "MAN" },
    service: "Air Express",
    carrier: "UPS",
    weightKg: 2.4,
    pieces: 1,
    contents: "Documents",
    estimatedDelivery: "2026-11-19",
    events: [
      {
        stage: "booked",
        at: "2026-11-13T09:20:00+01:00",
        location: "Wuse, Abuja",
        note: "Shipment booked. Waiting for courier collection.",
      },
    ],
  },
];
