import localFont from "next/font/local";

/**
 * IBM Plex: an industrial typeface drawn for labels, manuals and
 * documentation, which suits a product built around the waybill.
 * Self-hosted so builds never depend on a font CDN.
 */
export const plexSans = localFont({
  src: [
    { path: "./ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./ibm-plex-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

/** Used only for real codes: tracking numbers and hub codes. */
export const plexMono = localFont({
  src: [
    { path: "./ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
