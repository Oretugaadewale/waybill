import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { plexMono, plexSans } from "@/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Waybill: track your shipment",
    template: "%s | Waybill",
  },
  description:
    "Track cross-border shipments between Nigeria, the US, the UK and Canada. A portfolio project by Adewale Oretuga.",
};

export const viewport: Viewport = {
  themeColor: "#14213d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-NG"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
