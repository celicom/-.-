import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { APPLIANCE_CATEGORIES, CLEANING_PAGES, REPAIR_SECTIONS, ZHK, slugify } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Автогенерация карты сайта для Яндекса и Google. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const codes = await prisma.errorCode.findMany({ select: { brand: true, code: true } });
  const brands = [...new Set(codes.map((c) => slugify(c.brand)))];
  const now = new Date();
  const u = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly"): MetadataRoute.Sitemap[number] => ({
    url: `${SITE}${path}`, lastModified: now, changeFrequency, priority,
  });
  return [
    u("/", 1, "daily"),
    ...APPLIANCE_CATEGORIES.map((c) => u(`/remont/${c.slug}`, 0.9)),
    ...REPAIR_SECTIONS.map((s) => u(`/remont/${s.slug}`, 0.9)),
    u("/codes", 0.8),
    ...brands.map((b) => u(`/codes/${b}`, 0.7)),
    ...codes.map((c) => u(`/codes/${slugify(c.brand)}/${slugify(c.code)}`, 0.6, "monthly")),
    u("/uborka", 0.9),
    ...Object.values(CLEANING_PAGES).map((c) => u(`/uborka/${c.slug}`, 0.8)),
    ...ZHK.map((z) => u(`/zhk/${z.slug}`, 0.7)),
    u("/about", 0.5, "monthly"),
    u("/partner", 0.6, "monthly"),
  ];
}
