import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rezumate",
    short_name: "Rezumate",
    description: "Native iOS resume optimization with ATS scoring and local writing suggestions.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/rezumate-logo.png",
        sizes: "378x378",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
