import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://luxe-roads.example";
const description =
  "Curated luxury campervan road trips across Australia with premium vans, scenic routes, stays, add-ons and support.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Luxe Roads | Luxury Road Trips Across Australia",
  description,
  openGraph: {
    title: "Luxe Roads | Luxury Road Trips Across Australia",
    description,
    url: siteUrl,
    siteName: "Luxe Roads",
    type: "website"
  },
  alternates: {
    canonical: siteUrl
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102B35"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
