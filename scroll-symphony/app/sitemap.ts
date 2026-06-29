import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://malakiaiono.com";
  return [
    {
      url: base,
      lastModified: new Date("2026-06-20"),
      changeFrequency: "monthly",
      priority: 1
    }
  ];
}
