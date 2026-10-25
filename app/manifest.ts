import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Сосед.ру — сервис для дома",
    short_name: "Сосед.ру",
    description: "Мастера, уборка и клуб соседей в вашем ЖК",
    start_url: "/client",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#112140",
    lang: "ru",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
