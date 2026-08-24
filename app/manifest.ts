import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shat Roulette",
    short_name: "Shat",
    description: "Random chat for people who are currently on the toilet.",
    start_url: "/",
    display: "standalone",
    background_color: "#EFE4D2",
    theme_color: "#EFE4D2",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
