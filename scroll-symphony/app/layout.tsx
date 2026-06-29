import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://malakiaiono.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Malaki Aiono - AI Founder, Product Builder & Automation Strategist",
  description:
    "Founder portfolio of Malaki Aiono, showcasing AI products, automation systems, digital ventures, Solcraft, Skillfusion.ai, OPRealm, Site Potential, and AI Malaki.",
  openGraph: {
    title: "Malaki Aiono - AI Founder, Product Builder & Automation Strategist",
    description:
      "A cinematic founder portfolio demonstrating AI products, automation systems, digital ventures, and growth engines.",
    url: siteUrl,
    siteName: "The Scroll Symphony",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Malaki Aiono founder portfolio command center" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Malaki Aiono - AI Founder, Product Builder & Automation Strategist",
    description: "I build digital systems that turn ideas into traction.",
    images: ["/og.svg"]
  },
  alternates: {
    canonical: siteUrl
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070d"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: "Malaki Aiono",
        jobTitle: "Founder, AI Product Builder, Automation Strategist, Growth Operator",
        url: siteUrl,
        knowsAbout: [
          "AI products",
          "automation systems",
          "lead generation",
          "web applications",
          "digital ventures",
          "go-to-market strategy"
        ],
        founder: ["Solcraft", "Skillfusion.ai", "OPRealm", "Site Potential"]
      },
      {
        "@type": "WebSite",
        name: "The Scroll Symphony",
        url: siteUrl,
        description: "Interactive founder portfolio for Malaki Aiono."
      }
    ]
  };

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
