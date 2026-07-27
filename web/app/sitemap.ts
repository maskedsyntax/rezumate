import type { MetadataRoute } from "next";

const routes = [
  "",
  "/faq",
  "/privacy",
  "/terms",
  "/support",
  "/blog",
  "/blog/on-device-resume-scoring",
  "/blog/what-your-resume-file-reveals"
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://rezumate.app${route}`,
    lastModified: new Date("2026-07-23"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6
  }));
}
