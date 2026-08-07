import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aijobs.atlasnexus.tech";

  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/bounties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/post`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/stats`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/revenue`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/install`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/risk`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/security`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/support`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
