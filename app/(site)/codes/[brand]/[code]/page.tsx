import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, Clock, Lightbulb, Sparkles, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { APPLIANCE_CATEGORIES, BRANDS, slugify } from "@/lib/catalog";
import { OrderFlow } from "@/components/site/OrderFlow";
import { Breadcrumbs, GuaranteeStrip, JsonLd, Section } from "@/components/site/SiteParts";
import { MinOrderNote, Turnkey, WorkRange } from "@/components/Prices";
import { Pill } from "@/components/ui";

export const dynamic = "force-dynamic";

const FREQ = { often: { label: "часто", tone: "red" }, sometimes: { label: "иногда", tone: "amber" }, rare: { label: "редко", tone: "gray" } } as const;

async function load(brand: string, code: string) {
  const all = await prisma.errorCode.findMany();
  const same = all.filter((r) => slugify(r.brand) === brand);
  const row = same.find((r) => slugify(r.code) === code);
  return { row, same, all };
}

export async function generateMetadata({ params }: { params: { brand: string; code: string } }): Promise<Metadata> {
  const { row } = await load(params.brand, params.code);
  if (!row) return {};
  const who = row.brand === "Любая марка" ? "" : `${row.brand} `;
  return {
    title: `${who}${row.code}: ${row.title.toLowerCase()}. Причины и ремонт | Сосед.pro`,
    description: `${who}${row.code}: ${row.title.toLowerCase()}. Что проверить самому бесплатно, цена ремонта от ${row.priceWorkFrom} ₽ (Москва), мастер за 30 минут, гарантия 1 год.`,
    alternates: { canonical: `/codes/${params.brand}/${params.code}` },
  };
}

export default async function CodePage({ params }: { params: { brand: string; code: string } }) {
  const { row, same, all } = await load(params.brand, params.code);
  if (!row) notFound();
  const cat = APPLIANCE_CATEGORIES.find((c) => c.id === row.category)!;
  const causes = JSON.parse(row.causes) as { text: string; freq: keyof typeof FREQ }[];
  const selfCheck = JSON.parse(row.selfCheck) as string[];
  const masterSteps = JSON.parse(row.masterSteps) as string[];
  const whenMaster = JSON.parse(row.whenMaster) as string[];
  const faqRows = JSON.parse(row.faq) as { q: string; a: string }[];
  const related = [...same.filter((r) => r.id !== row.id), ...all.filter((r) => r.category === row.category && r.brand !== row.brand)].slice(0, 6);
  const anyBrand = row.brand === "Любая марка";
  const price = { workFrom: row.priceWorkFrom, workTo: row.priceWorkTo, partsFrom: row.partsFrom, partsTo: row.partsTo };

  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `Что означает ${row.code}${anyBrand ? "" : ` на ${row.brand}`}?`, acceptedAnswer: { "@type": "Answer", text: `${row.title}. ${causes.length ? `Вероятные причины: ${causes.map((c) => c.text).join("; ")}.` : ""}` } },
      { "@type": "Question", name: `Что проверить самому при ${row.code}?`, acceptedAnswer: { "@type": "Answer", text: selfCheck.join(" ") } },
      { "@type": "Question", name: `Сколько стоит ремонт при ${row.code}?`, acceptedAnswer: { "@type": "Answer", text: `Работа мастера от ${row.priceWorkFrom} ₽ в Москве, под ключ с запчастями до ${row.priceWorkTo + row.partsTo} ₽. В других городах работа дешевле, запчасти стоят одинаково. Гарантия 1 год.` } },
      ...faqRows.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ label: "Коды ошибок", href: "/codes" }, ...(anyBrand ? [] : [{ label: row.brand, href: `/codes/${params.brand}` }]), { label: row.code }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-600">
          <span>{cat.emoji} {cat.label}{anyBrand ? " • любая марка" : ` • ${row.brand}`}</span>
          {row.verified ? <Pill tone="green"><BadgeCheck className="h-3 w-3" /> Данные мастера Рафаэля</Pill> : <Pill tone="amber"><AlertTriangle className="h-3 w-3" /> Составлено автоматически</Pill>}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{anyBrand ? "" : `${row.brand}: `}{row.code}. {row.title}</h1>
        <div className="mt-5 max-w-3xl"><GuaranteeStrip note={<MinOrderNote />} /></div>
      </section>

      <Section className="!py-6">
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            {row.meaning && (
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
                <h2 className="text-xl font-bold text-ink">Что означает код</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">{row.meaning.split("\n\n").map((p) => <p key={p}>{p}</p>)}</div>
              </div>
            )}

            {!row.verified && (
              <div className="flex gap-3 rounded-3xl border border-amber-200/70 bg-amber-50 p-5 text-sm leading-relaxed text-amber-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>Расшифровка составлена по типовым случаям. У разных моделей один и тот же код может означать разное, поэтому точную причину определяет мастер после диагностики. Вероятность причин указана словами и ориентировочная.</span>
              </div>
            )}

            {causes.length > 0 && (
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
                <h2 className="text-xl font-bold text-ink">Вероятные причины</h2>
                <ul className="mt-4 space-y-3">
                  {causes.map((c, i) => (
                    <li key={c.text} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                      <span className="flex-1 text-slate-700">{c.text}</span>
                      <Pill tone={FREQ[c.freq].tone}>{FREQ[c.freq].label}</Pill>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-800"><Lightbulb className="h-5 w-5" /> Проверьте сами бесплатно</h2>
              <p className="mt-1 text-sm text-emerald-700/80">Начните с этого. Если ошибка ушла, мастер не нужен.</p>
              <ol className="mt-4 space-y-3">
                {selfCheck.map((s, i) => (
                  <li key={s} className="flex gap-3 text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">{i + 1}</span>{s}</li>
                ))}
              </ol>
            </div>

            {masterSteps.length > 0 && (
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
                <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><Wrench className="h-5 w-5 text-slate-400" /> Как чинит мастер</h2>
                <ol className="mt-4 space-y-3">
                  {masterSteps.map((s, i) => <li key={s} className="flex gap-3 text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>{s}</li>)}
                </ol>
              </div>
            )}

            {whenMaster.length > 0 && (
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
                <h2 className="text-xl font-bold text-ink">Когда нужен мастер</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">{whenMaster.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">Цена ремонта</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Работа мастера</div><div className="mt-1 text-xl font-bold text-ink"><WorkRange from={row.priceWorkFrom} to={row.priceWorkTo} /></div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Под ключ с запчастями</div><div className="mt-1 text-xl font-bold text-ink"><Turnkey price={price} /></div></div>
              </div>
              <div className="mt-3 flex items-start gap-1.5 text-sm text-slate-500"><Clock className="mt-0.5 h-4 w-4 shrink-0" /> <span>{row.durationMin ? `~${row.durationMin} мин на месте. ` : ""}Выберите свой город в шапке сайта: цена работы пересчитается, запчасти по всей России стоят одинаково.</span></div>
            </div>

            {faqRows.length > 0 && (
              <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
                <h2 className="text-xl font-bold text-ink">Частые вопросы</h2>
                <div className="mt-3 space-y-4">{faqRows.map((f) => <div key={f.q}><div className="font-semibold text-ink">{f.q}</div><p className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</p></div>)}</div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-2">
            <div className="sticky top-32 rounded-3xl bg-ink p-6 text-white shadow-lift">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><Sparkles className="h-4 w-4" /> Мастер за 30 минут</div>
              <div className="mt-2 text-xl font-bold">Не помогло? Вызовите мастера{anyBrand ? "" : ` к ${row.brand}`}</div>
              <p className="mt-2 text-sm text-slate-400">Заявка с диагнозом «{row.code}» сразу уйдёт мастеру. Цена и состав работ фиксируются до начала.</p>
              <a href="#order" className="mt-5 block rounded-2xl bg-emerald-500 py-3.5 text-center font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-95">Вызвать мастера</a>
            </div>
          </aside>
        </div>
      </Section>

      <Section id="order" title="Заказать ремонт онлайн">
        <OrderFlow tabs={["repair"]} initialCategory={row.category} initialBrand={BRANDS[row.category]?.includes(row.brand) ? row.brand : null} initialCode={row.code} />
      </Section>

      <Section title="Похожие коды" className="!pt-2">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((c) => (
            <Link key={c.id} href={`/codes/${slugify(c.brand)}/${slugify(c.code)}`} className="flex items-baseline gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-soft ring-1 ring-slate-200/60 transition-all hover:ring-emerald-400">
              <span className="shrink-0 font-bold text-ink">{c.brand === "Любая марка" ? "" : `${c.brand} `}{c.code}</span>
              <span className="truncate text-slate-500">{c.title}</span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
