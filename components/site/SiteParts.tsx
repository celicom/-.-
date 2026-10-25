import Link from "next/link";
import { ChevronRight, Home, ShieldCheck } from "lucide-react";
import { APPLIANCE_CATEGORIES, CLEANING_PAGES, REPAIR_SECTIONS, ZHK, slugify } from "@/lib/catalog";
import { PHONE, PHONE_HREF } from "./SiteChrome";
import { COMPANY, companyFilled } from "@/src/config/company-legal";
import { LEGAL_LINKS } from "@/src/legal/documents";

export type Crumb = { label: string; href?: string };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Хлебные крошки + микроразметка BreadcrumbList. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: "Главная", href: "/" }, ...items];
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${SITE}${c.href}` } : {}) })),
  };
  return (
    <nav aria-label="Хлебные крошки" className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-slate-500">
        {all.map((c, i) => (
          <li key={c.label + i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="flex items-center gap-1 transition-colors hover:text-ink">{i === 0 && <Home className="h-3.5 w-3.5" />}{c.label}</Link>
            ) : (
              <span className="font-medium text-ink">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function Section({ id, title, lead, children, className = "" }: { id?: string; title?: string; lead?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 sm:py-14 ${className}`}>
      {title && (
        <div className="mb-7 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-[32px] sm:leading-tight">{title}</h2>
          {lead && <p className="mt-2 text-base leading-relaxed text-slate-500">{lead}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function GuaranteeStrip({ note }: { note: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{note}</span>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-[#0B1120] text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-base font-bold text-white">С</span>
            <span className="text-lg font-bold text-white">Сосед<span className="text-emerald-400">.pro</span></span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">Ремонт техники, уборка и помощь по дому от проверенных мастеров из вашего ЖК. Фиксированная цена до начала работ, гарантия 1 год, страховка квартиры 100 000 ₽.</p>
          <a href={PHONE_HREF} className="mt-4 block text-xl font-semibold text-white">{PHONE}</a>
          <div className="text-xs">Ежедневно с 8:00 до 23:00</div>
          <Link href="/partner" className="mt-5 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95">Стать мастером / партнёром</Link>
        </div>
        <FooterCol title="Ремонт">
          {APPLIANCE_CATEGORIES.map((c) => <Link key={c.id} href={`/remont/${c.slug}`}>{c.seo}</Link>)}
          {REPAIR_SECTIONS.map((s) => <Link key={s.slug} href={`/remont/${s.slug}`}>{s.seo}</Link>)}
        </FooterCol>
        <FooterCol title="Уборка и коды">
          {Object.values(CLEANING_PAGES).map((c) => <Link key={c.slug} href={`/uborka/${c.slug}`}>{c.h1}</Link>)}
          <Link href="/codes">Энциклопедия кодов ошибок</Link>
          {["Jura", "DeLonghi", "Bosch", "Miele", "LG"].map((b) => <Link key={b} href={`/codes/${slugify(b)}`}>Коды {b}</Link>)}
        </FooterCol>
        <FooterCol title="Компания">
          {ZHK.map((z) => <Link key={z.slug} href={`/zhk/${z.slug}`}>{z.name}</Link>)}
          <Link href="/about">О компании</Link>
          <Link href="/partner">Мастерам и партнёрам</Link>
          {LEGAL_LINKS.map((l) => <Link key={l.slug} href={`/legal/${l.slug}`}>{l.label}</Link>)}
          <Link href="/client">Приложение клиента</Link>
        </FooterCol>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs sm:px-6 md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} {COMPANY.legalName}. ИНН {COMPANY.inn}, ОГРН {COMPANY.ogrn}. {COMPANY.legalAddress}. {COMPANY.supportEmail}</span>
          <span>{companyFilled() ? "Цены ориентировочные, итог согласуется до начала работ." : "Демо-версия: реквизиты в src/config/company-legal.ts. Цены ориентировочные."}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 flex flex-col gap-2 text-sm [&_a]:transition-colors [&_a:hover]:text-white">{children}</div>
    </div>
  );
}
