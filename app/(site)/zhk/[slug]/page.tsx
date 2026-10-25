import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, TrainFront } from "lucide-react";
import { APPLIANCE_CATEGORIES, REPAIR_SECTIONS, ZHK } from "@/lib/catalog";
import { OrderFlow } from "@/components/site/OrderFlow";
import { ZhkLive } from "@/components/site/SiteLive";
import { Breadcrumbs, JsonLd, Section } from "@/components/site/SiteParts";

export function generateStaticParams() {
  return ZHK.map((z) => ({ slug: z.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const z = ZHK.find((x) => x.slug === params.slug);
  if (!z) return {};
  return {
    title: `Ремонт техники, сантехник, электрик и уборка в ${z.name} | Сосед.pro`,
    description: `Мастера и клинеры прямо в ${z.name} (${z.address}, м. ${z.metro}): приезд за 15–35 минут, фиксированная цена, гарантия 1 год.`,
    alternates: { canonical: `/zhk/${z.slug}` },
  };
}

export default function ZhkPage({ params }: { params: { slug: string } }) {
  const z = ZHK.find((x) => x.slug === params.slug);
  if (!z) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: `Сосед.pro — ${z.name}`,
    address: { "@type": "PostalAddress", streetAddress: z.address, addressLocality: "Москва", addressCountry: "RU" },
    areaServed: z.name,
  };
  return (
    <>
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ label: "ЖК и районы" }, { label: z.name }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Ремонт техники, сантехник, электрик и уборка в {z.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{z.address}</span>
          <span className="flex items-center gap-1.5"><TrainFront className="h-4 w-4" />м. {z.metro}</span>
          <span>{z.homes} корпусов • {z.residents}</span>
        </div>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{z.about}</p>
      </section>

      <Section title="Мастера вашего дома на карте" lead="Живая карта: цвет обводки показывает, свободен мастер или на заказе.">
        <ZhkLive zhk={z} />
      </Section>

      <Section title={`Заказать в ${z.name}`} lead="Заявка уйдёт ближайшему мастеру вашего квартала.">
        <OrderFlow address={`${z.address}, кв. 14`} center={z} />
      </Section>

      <Section title="Услуги в вашем доме">
        <div className="flex flex-wrap gap-2">
          {APPLIANCE_CATEGORIES.map((c) => <Link key={c.id} href={`/remont/${c.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400 active:scale-95">{c.emoji} {c.seo}</Link>)}
          {REPAIR_SECTIONS.map((s) => <Link key={s.slug} href={`/remont/${s.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400 active:scale-95">{s.emoji} {s.seo}</Link>)}
          <Link href="/uborka" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400 active:scale-95">✨ Уборка</Link>
        </div>
        <div className="mt-6 text-sm text-slate-500">Другие ЖК: {ZHK.filter((x) => x.slug !== z.slug).map((x, i) => (<span key={x.slug}>{i > 0 && ", "}<Link href={`/zhk/${x.slug}`} className="font-semibold text-ink underline-offset-2 hover:underline">{x.name}</Link></span>))}</div>
      </Section>
    </>
  );
}
