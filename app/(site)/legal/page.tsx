import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Breadcrumbs } from "@/components/site/SiteParts";
import { LEGAL_SLUGS, buildDocuments } from "@/src/legal/documents";

export const metadata: Metadata = { title: "Правовые документы | Сосед.Про", alternates: { canonical: "/legal" } };

export default function LegalIndex() {
  const docs = buildDocuments();
  return (
    <>
      <Breadcrumbs items={[{ label: "Документы" }]} />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Правовые документы</h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-600">Политика обработки персональных данных, согласие, публичная оферта для Заказчиков и агентский договор для Исполнителей.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {LEGAL_SLUGS.map((s) => (
            <Link key={s} href={`/legal/${s}`} className="flex gap-4 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft transition-all hover:shadow-lift active:scale-[0.98]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50"><FileText className="h-6 w-6 text-slate-400" /></span>
              <span><span className="block text-lg font-bold text-ink">{docs[s].title}</span><span className="mt-1 block text-sm text-slate-500">{docs[s].subtitle}</span></span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
