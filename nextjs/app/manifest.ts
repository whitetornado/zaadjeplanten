import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "zaadjeplanten.nl",
    short_name: "zaadjeplanten",
    description: "Een digitale blaasbloem — met liefde gegeven door Oleg Morozov",
    start_url: "/",
    display: "standalone",
    background_color: "#101f12",
    theme_color: "#101f12",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
