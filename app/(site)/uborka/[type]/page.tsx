import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CLEANING_PAGES, cleaningTypeBySlug } from "@/lib/catalog";
import { OrderFlow } from "@/components/site/OrderFlow";
import { Breadcrumbs, GuaranteeStrip, JsonLd, Section } from "@/components/site/SiteParts";
import { Work } from "@/components/Prices";

export const dynamic = "force-dynamic";

const ROOMS = [[1, "1-комнатная"], [2, "2-комнатная"], [3, "3-комнатная"], [4, "4+ комнат"]] as const;

export function generateMetadata({ params }: { params: { type: string } }): Metadata {
  const t = cleaningTypeBySlug(params.type);
  if (!t) return {};
  return {
    title: `${t.h1}: цена, чек-лист, заказ онлайн | Сосед.pro`,
    description: `${t.h1}: фиксированная цена онлайн для вашего города, клинер из вашего ЖК, эко-химия и гарантия 1 год. ${t.lead}`,
    alternates: { canonical: `/uborka/${t.slug}` },
  };
}

export default async function UborkaType({ params }: { params: { type: string } }) {
  const t = cleaningTypeBySlug(params.type);
  if (!t) notFound();
  const items = await prisma.priceItem.findMany({ where: { groupKey: { in: ["clean-type", "clean-window"] } } });
  const price = (id: string) => items.find((i) => i.id === id)?.basePrice ?? 0;
  const windows = items.filter((i) => i.groupKey === "clean-window");
  const onlyWindows = t.id === "windows";
  const sqm = price(`clean-type:${t.id}:sqm`);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t.h1,
    provider: { "@type": "Organization", name: "Сосед.pro" },
    areaServed: "Россия",
    offers: { "@type": "Offer", priceCurrency: "RUB", price: onlyWindows ? price("clean-window:sash1") : price(`clean-type:${t.id}:1`) },
  };
  const others = Object.values(CLEANING_PAGES).filter((c) => c.slug !== t.slug);

  return (
    <>
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ label: "Уборка", href: "/uborka" }, { label: t.h1 }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t.h1} в вашем ЖК</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">{t.lead}</p>
        <div className="mt-5 max-w-3xl"><GuaranteeStrip note="Фиксированная цена до начала работ • эко-химия по запросу • гарантия 1 год" /></div>
      </section>

      <Section title="Рассчитайте стоимость и закажите" lead="Выберите комнаты или площадь, окна и опции. Город выбирается в шапке сайта.">
        <OrderFlow tabs={["cleaning"]} initialClean={t.id} />
      </Section>

      <Section title={onlyWindows ? "Цены за окна" : "Цены по размеру квартиры"}>
        {onlyWindows ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {windows.map((w) => (
              <div key={w.id} className="rounded-3xl border border-slate-200/60 bg-white p-5 text-center shadow-soft">
                <div className="text-sm font-medium text-slate-500">{w.label}</div>
                <div className="mt-1 text-2xl font-bold text-ink"><Work base={w.basePrice} /></div>
                <div className="mt-1 text-xs text-slate-400">за {w.unit}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {ROOMS.map(([r, label]) => (
                <div key={r} className="rounded-3xl border border-slate-200/60 bg-white p-5 text-center shadow-soft">
                  <div className="text-sm font-medium text-slate-500">{label}</div>
                  <div className="mt-1 text-3xl font-bold text-ink"><Work base={price(`clean-type:${t.id}:${r}`)} /></div>
                </div>
              ))}
            </div>
            {sqm > 0 && <div className="mt-3 text-sm text-slate-500">Расчёт по площади: <b className="text-ink"><Work base={sqm} /></b> за м².</div>}
          </>
        )}
        <div className="mt-3 text-sm text-slate-500">Состав услуги можно расширить: духовка, холодильник, СВЧ, вытяжка, посуда, глажка, окна, эко-химия.</div>
      </Section>

      <Section title="Что входит в уборку каждого уголка" lead="Чек-лист клинера: он отмечает каждый пункт в приложении, а вы видите фотоотчёт.">
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(t.checklist).map(([room, list]) => (
            <div key={room} className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
              <div className="text-lg font-bold text-ink">{room}</div>
              <ul className="mt-3 space-y-2">
                {list.map((i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check className="h-3 w-3 text-white" strokeWidth={3} /></span>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Другие виды уборки" className="!pt-2">
        <div className="flex flex-wrap gap-2">
          {others.map((o) => (
            <Link key={o.slug} href={`/uborka/${o.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400 active:scale-95">{o.h1}</Link>
          ))}
        </div>
      </Section>
    </>
  );
}
