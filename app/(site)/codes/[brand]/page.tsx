import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { APPLIANCE_CATEGORIES, slugify } from "@/lib/catalog";
import { Work } from "@/components/Prices";
import { Breadcrumbs, Section } from "@/components/site/SiteParts";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const all = await prisma.errorCode.findMany({ orderBy: [{ category: "asc" }, { code: "asc" }] });
  const rows = all.filter((r) => slugify(r.brand) === slug);
  return { rows, name: rows[0]?.brand };
}

export async function generateMetadata({ params }: { params: { brand: string } }): Promise<Metadata> {
  const { rows, name } = await load(params.brand);
  if (!rows.length) return {};
  return {
    title: `Коды ошибок ${name}: расшифровка и ремонт | Сосед.pro`,
    description: `${rows.length} кодов ошибок ${name}: причины, проверка своими руками и цена ремонта. Мастер из вашего ЖК за 30 минут, гарантия 1 год.`,
    alternates: { canonical: `/codes/${params.brand}` },
  };
}

export default async function BrandCodes({ params }: { params: { brand: string } }) {
  const { rows, name } = await load(params.brand);
  if (!rows.length) notFound();
  const cats = APPLIANCE_CATEGORIES.filter((c) => rows.some((r) => r.category === c.id));
  return (
    <>
      <Breadcrumbs items={[{ label: "Коды ошибок", href: "/codes" }, { label: name! }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Коды ошибок {name}: расшифровка и ремонт</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">Выберите код с дисплея вашей техники {name}. Сначала проверьте простые причины бесплатно, а если не помогло, вызовите мастера: цена фиксируется заранее.</p>
      </section>
      {cats.map((cat) => (
        <Section key={cat.id} title={`${cat.emoji} ${cat.label} ${name}`} className="!py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.filter((r) => r.category === cat.id).map((c) => (
              <Link key={c.id} href={`/codes/${params.brand}/${slugify(c.code)}`} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft transition-all hover:shadow-lift active:scale-[0.98]">
                <div className="text-lg font-bold text-ink">{c.code}</div>
                <div className="mt-1 text-sm text-slate-600">{c.title}</div>
                <div className="mt-3 text-sm font-semibold text-emerald-600"><Work base={c.priceWorkFrom} prefix="от " /></div>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
