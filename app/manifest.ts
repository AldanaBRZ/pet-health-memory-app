import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pet Health Memory",
    short_name: "Pet Memory",
    description: "A health memory and longevity tracker for serious pet parents.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f0e7",
    theme_color: "#245247",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
