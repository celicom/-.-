import Link from "next/link";
import { AlertTriangle, FileText } from "lucide-react";
import { COMPANY, companyFilled } from "@/src/config/company-legal";
import { LEGAL_LINKS, type Block, type LegalDocument } from "@/src/legal/documents";
import { PrintButton } from "./PrintButton";

/** Подсвечивает незаполненные реквизиты вида [ИНН]. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/g).map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? <mark key={i} className="rounded bg-amber-100 px-1 text-amber-800">{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (typeof b === "string") return <p className="leading-relaxed"><Marked text={b} /></p>;
  if ("ul" in b) return <ul className="list-disc space-y-1.5 pl-6 leading-relaxed">{b.ul.map((x) => <li key={x}><Marked text={x} /></li>)}</ul>;
  if ("ol" in b) return <ol className="list-decimal space-y-1.5 pl-6 leading-relaxed">{b.ol.map((x) => <li key={x}><Marked text={x} /></li>)}</ol>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[480px] text-sm">
        <thead><tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{b.table.head.map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
        <tbody>{b.table.rows.map((r) => <tr key={r[0]} className="border-t border-slate-100">{r.map((cell, i) => <td key={i} className={`px-4 py-2.5 ${i === 0 ? "font-medium text-ink" : "text-slate-600"}`}><Marked text={cell} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function LegalView({ doc, slug }: { doc: LegalDocument; slug: string }) {
  const filled = companyFilled();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="no-print mb-6 space-y-3">
        <div className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span><b>Шаблон документа.</b> Текст составлен по структуре требований законодательства РФ и должен быть проверен юристом перед запуском сервиса.{!filled && <> Реквизиты компании не заполнены: впишите их в файле <code className="rounded bg-amber-100 px-1">src/config/company-legal.ts</code>, подсвеченные значения [в скобках] обновятся во всех документах.</>}</span>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="no-print lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><FileText className="h-4 w-4 text-slate-400" /> Оглавление</div>
            <nav className="mt-3 space-y-0.5 text-sm">
              {doc.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink">{s.title}</a>)}
            </nav>
            <PrintButton />
          </div>
          <div className="mt-4 rounded-3xl border border-slate-200/60 bg-white p-4 text-sm shadow-soft">
            <div className="font-semibold text-ink">Другие документы</div>
            <div className="mt-2 space-y-1">
              {LEGAL_LINKS.filter((l) => l.slug !== slug).map((l) => <Link key={l.slug} href={`/legal/${l.slug}`} className="block rounded-lg px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink">{l.label}</Link>)}
            </div>
          </div>
        </aside>

        <article className="print-area rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft sm:p-10 print:border-0 print:shadow-none">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{COMPANY.brand} • редакция {COMPANY.docsVersion} от {COMPANY.docsDate}</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{doc.title}</h1>
          <p className="mt-1 text-slate-500">{doc.subtitle}</p>
          <div className="mt-8 space-y-9 text-[15px] text-slate-700">
            {doc.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-32 space-y-3">
                <h2 className="text-lg font-bold text-ink">{s.title}</h2>
                {s.body.map((b, i) => <BlockView key={i} b={b} />)}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
