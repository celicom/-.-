import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CLEANING_PAGES } from "@/lib/catalog";
import { OrderFlow } from "@/components/site/OrderFlow";
import { Breadcrumbs, Section } from "@/components/site/SiteParts";
import { Work } from "@/components/Prices";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Уборка квартир: поддерживающая, генеральная, после ремонта | Сосед.pro",
  description: "Клининг квартир и помещений от соседей-клинеров вашего ЖК: фиксированная цена, эко-химия, гарантия 1 год. Калькулятор стоимости онлайн для вашего города.",
  alternates: { canonical: "/uborka" },
};

export default async function UborkaIndex() {
  const items = await prisma.priceItem.findMany({ where: { groupKey: { in: ["clean-type", "clean-window"] } } });
  const price = (id: string) => items.find((i) => i.id === id)?.basePrice ?? 0;
  return (
    <>
      <Breadcrumbs items={[{ label: "Уборка" }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Уборка квартир в вашем ЖК по твёрдой цене</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">Клинер из соседнего подъезда приходит со своей эко-химией и оборудованием. Цена считается онлайн для вашего города и не меняется на месте. Гарантия 1 год.</p>
      </section>

      <Section title="Калькулятор уборки" lead="Выберите тип, размер квартиры или площадь, окна и опции: цена и время пересчитаются мгновенно. Город выбирается в шапке сайта.">
        <OrderFlow tabs={["cleaning"]} />
      </Section>

      <Section title="Виды уборки" lead="Цены для двухкомнатной квартиры без дополнительных опций.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CLEANING_PAGES).map(([id, p]) => {
            const base = id === "windows" ? price("clean-window:sash1") : price(`clean-type:${id}:2`);
            return (
              <Link key={id} href={`/uborka/${p.slug}`} className="flex flex-col rounded-3xl border border-slate-200/60 bg-white p-5 shadow-soft transition-all hover:shadow-lift active:scale-[0.98]">
                <div className="text-lg font-bold text-ink">{p.h1}</div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{p.lead}</p>
                <div className="mt-4 text-sm font-semibold text-emerald-600"><Work base={base} prefix="от " /></div>
              </Link>
            );
          })}
        </div>
      </Section>
    </>
  );
}
