import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { APPLIANCE_CATEGORIES, BRANDS, REPAIR_SECTIONS, slugify } from "@/lib/catalog";
import { OrderFlow } from "@/components/site/OrderFlow";
import { PriceTable, type PriceRowData } from "@/components/site/PriceTable";
import { Breadcrumbs, GuaranteeStrip, JsonLd, Section } from "@/components/site/SiteParts";
import { MinOrderNote, Work } from "@/components/Prices";

export const dynamic = "force-dynamic";

function resolve(slug: string) {
  const appliance = APPLIANCE_CATEGORIES.find((c) => c.slug === slug);
  if (appliance) return { kind: "appliance" as const, appliance };
  const section = REPAIR_SECTIONS.find((s) => s.slug === slug);
  if (section) return { kind: "section" as const, section };
  return null;
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const r = resolve(params.category);
  if (!r) return {};
  const title = r.kind === "appliance" ? r.appliance.seo : r.section.seo;
  const from = r.kind === "appliance" ? r.appliance.from : r.section.from;
  return {
    title: `${title} на дому от ${from} ₽ | Сосед.pro`,
    description: `${title}: мастер из вашего ЖК приедет за 30–45 минут. Фиксированная цена до начала работ, гарантия 1 год, страховка квартиры 100 000 ₽.`,
    alternates: { canonical: `/remont/${params.category}` },
  };
}

export default async function RemontPage({ params }: { params: { category: string } }) {
  const r = resolve(params.category);
  if (!r) notFound();

  const title = r.kind === "appliance" ? r.appliance.seo : r.section.seo;
  const emoji = r.kind === "appliance" ? r.appliance.emoji : r.section.emoji;
  const codes = r.kind === "appliance" ? await prisma.errorCode.findMany({ where: { category: r.appliance.id }, orderBy: [{ source: "desc" }, { brand: "asc" }, { code: "asc" }] }) : [];
  const fixed = r.kind === "section" ? await prisma.priceItem.findMany({ where: { groupKey: r.section.items }, orderBy: { sort: "asc" } }) : [];
  const frequent = codes.filter((c) => c.verified && c.brand !== "Любая марка").slice(0, 6);

  const faq = codes.filter((c) => c.verified).slice(0, 5).map((c) => ({
    "@type": "Question",
    name: `${c.brand}: что значит ${c.code}?`,
    acceptedAnswer: { "@type": "Answer", text: `${c.title}. Ремонт от ${c.priceWorkFrom} ₽, гарантия 1 год.` },
  }));

  const rows: PriceRowData[] =
    r.kind === "appliance"
      ? codes.map((c) => ({ key: c.id, href: `/codes/${slugify(c.brand)}/${slugify(c.code)}`, name: `${c.brand} ${c.code}`, sub: c.title, min: c.durationMin, kind: "code", w: [c.priceWorkFrom, c.priceWorkTo], p: [c.partsFrom, c.partsTo] }))
      : fixed.map((s) => ({ key: s.id, name: s.label, sub: s.symptoms, min: s.durationMin, kind: "fixed", base: s.basePrice }));

  return (
    <>
      <Breadcrumbs items={[{ label: "Ремонт", href: "/#services" }, { label: title }]} />
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq }} />}
      <section className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6">
        <div className="flex items-start gap-4">
          <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white text-3xl shadow-soft ring-1 ring-slate-200/60 sm:flex">{emoji}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title} в вашем ЖК за 30–45 минут</h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">
              {r.kind === "appliance"
                ? `Приедет мастер из вашего квартала с набором под модель. Диагностика бесплатна при ремонте, цена фиксируется до начала работ, на каждый ремонт действует гарантия 1 год.`
                : `Мастер-сосед из вашего квартала приедет за 30–45 минут. Цена из каталога фиксированная, без доплат на месте. Работаем в бахилах и с фотофиксацией «до» и «после».`}
            </p>
          </div>
        </div>
        <div className="mt-5 max-w-3xl"><GuaranteeStrip note={<MinOrderNote />} /></div>
      </section>

      <Section title="Вызвать мастера онлайн" lead="Заявка сразу попадёт мастеру и в диспетчерскую, а вы увидите, как он едет к вам.">
        <OrderFlow
          tabs={r.kind === "appliance" ? ["repair"] : r.section.items === "junior" ? ["junior"] : ["home"]}
          initialCategory={r.kind === "appliance" ? r.appliance.id : null}
        />
      </Section>

      {r.kind === "appliance" && (
        <>
          <Section title={`Частые поломки: ${r.appliance.one}`} lead="Нажмите на код, чтобы открыть инструкцию «Проверьте сами бесплатно».">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {frequent.map((c) => (
                <Link key={c.id} href={`/codes/${slugify(c.brand)}/${slugify(c.code)}`} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft transition-all hover:shadow-lift active:scale-[0.98]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{c.brand}</div>
                  <div className="mt-0.5 text-base font-bold text-ink">{c.code}</div>
                  <div className="mt-1 text-sm text-slate-600">{c.title}</div>
                  <div className="mt-3 text-sm font-semibold text-emerald-600"><Work base={c.priceWorkFrom} prefix="от " /></div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Бренды" lead={`С какими ${r.appliance.label.toLowerCase()} мы работаем.`}>
            <div className="flex flex-wrap gap-2">
              {BRANDS[r.appliance.id].map((b) => (
                <Link key={b} href={`/codes/${slugify(b)}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400 active:scale-95">{b}</Link>
              ))}
            </div>
          </Section>

          <Section title={`Цены: ${r.appliance.seo.toLowerCase()}`} lead="Цена работы мастера зависит от города, оригинальные запчасти стоят одинаково по всей России. Выберите свой город в шапке сайта, и цены пересчитаются. Окончательная смета согласуется до начала работ.">
            <PriceTable rows={rows} />
          </Section>
        </>
      )}

      {r.kind === "section" && (
        <Section title={`Цены: ${r.section.label.toLowerCase()}`} lead="Фиксированные цены без доплат на месте. Выберите город в шапке сайта, чтобы увидеть цены для вашего региона.">
          <PriceTable rows={rows} turnkeyLabel="С материалами" />
        </Section>
      )}

      <Section>
        <div className="flex items-center gap-3 rounded-3xl bg-ink p-6 text-white shadow-lift sm:p-8">
          <ShieldCheck className="hidden h-10 w-10 shrink-0 text-emerald-400 sm:block" />
          <div>
            <div className="text-lg font-bold">Страховка 100 000 ₽ и гарантия 1 год на каждый заказ</div>
            <div className="mt-1 text-sm text-slate-400">Если мастер что-то повредит, ущерб возместим из его гарантийного депозита и страховки.</div>
          </div>
        </div>
      </Section>
    </>
  );
}
