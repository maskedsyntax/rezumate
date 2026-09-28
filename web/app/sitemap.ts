import type { MetadataRoute } from "next";

const routes = [
  "",
  "/resume-checker",
  "/private-resume-checker",
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
    url: `https://www.rezumate.app${route}`,
    lastModified: new Date(["", "/resume-checker", "/private-resume-checker"].includes(route) ? "2026-09-29" : "2026-07-23"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6
  }));
}
