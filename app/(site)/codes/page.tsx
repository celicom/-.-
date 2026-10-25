import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { APPLIANCE_CATEGORIES, slugify } from "@/lib/catalog";
import { Breadcrumbs, Section } from "@/components/site/SiteParts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Коды ошибок бытовой техники: расшифровка и что делать | Сосед.pro",
  description: "Энциклопедия кодов ошибок кофемашин, стиральных, посудомоечных, сушильных машин, варочных панелей и духовок: причины, проверка своими руками и цена ремонта.",
  alternates: { canonical: "/codes" },
};

export default async function CodesIndex() {
  const rows = await prisma.errorCode.findMany({ orderBy: [{ brand: "asc" }, { code: "asc" }] });
  const brands = new Map<string, { name: string; count: number; cats: Set<string> }>();
  for (const r of rows) {
    const b = brands.get(r.brand) ?? { name: r.brand, count: 0, cats: new Set<string>() };
    b.count++;
    b.cats.add(r.category);
    brands.set(r.brand, b);
  }
  const list = [...brands.values()].sort((a, b) => a.name.localeCompare(b.name));
  const catLabel = (id: string) => APPLIANCE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <>
      <Breadcrumbs items={[{ label: "Коды ошибок" }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Энциклопедия кодов ошибок бытовой техники</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">{rows.length} кодов по {list.length} брендам. Для каждого: вероятные причины, честная проверка «сами и бесплатно» и цена ремонта. Если не помогло, мастер из вашего ЖК приедет за 30 минут.</p>
      </section>

      <Section title="Бренды">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((b) => (
            <Link key={b.name} href={`/codes/${slugify(b.name)}`} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft transition-all hover:shadow-lift active:scale-[0.98]">
              <div className="text-lg font-bold text-ink">{b.name}</div>
              <div className="mt-0.5 text-sm text-slate-500">{b.count} кодов</div>
              <div className="mt-2 text-xs text-slate-400">{[...b.cats].map(catLabel).join(", ")}</div>
            </Link>
          ))}
        </div>
      </Section>

      {APPLIANCE_CATEGORIES.map((cat) => {
        const items = rows.filter((r) => r.category === cat.id);
        if (!items.length) return null;
        return (
          <Section key={cat.id} title={`${cat.emoji} ${cat.label}`} className="!py-6">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <Link key={c.id} href={`/codes/${slugify(c.brand)}/${slugify(c.code)}`} className="flex items-baseline gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400">
                  <span className="shrink-0 font-bold text-ink">{c.brand} {c.code}</span>
                  <span className="truncate text-slate-500">{c.title}</span>
                </Link>
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}
