import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Публичный сайт открыт, кабинеты и API не индексируем.
      { userAgent: "*", allow: "/", disallow: ["/client", "/master", "/admin", "/api/"] },
      { userAgent: "Yandex", allow: "/", disallow: ["/client", "/master", "/admin", "/api/"], },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
