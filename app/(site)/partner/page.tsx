import type { Metadata } from "next";
import { Award, GraduationCap, ShieldCheck, Wallet } from "lucide-react";
import { Breadcrumbs, Section } from "@/components/site/SiteParts";
import { EarningsCalculator, PartnerForm } from "@/components/site/PartnerForm";

export const metadata: Metadata = {
  title: "Работа мастером, клинером или студентом рядом с домом | Сосед.pro",
  description: "Станьте мастером, клинером или Сосед.Джуниором: забирайте 85% от чека, работайте в своём ЖК, получайте заказы от соседей. Подайте анкету онлайн.",
  alternates: { canonical: "/partner" },
};

const PERKS = [
  { icon: Wallet, title: "85% от чека", text: "Выплата на карту сразу после подтверждения клиентом. Чеки самозанятого формируются автоматически." },
  { icon: ShieldCheck, title: "Работа рядом с домом", text: "Заказы только из вашего ЖК: без дальних поездок и пробок." },
  { icon: GraduationCap, title: "Академия роста", text: "Аудио-саммари книг по сервису и финансам. За прохождение комиссия снижается до 10%." },
  { icon: Award, title: "Защита мастера", text: "Деньги по заказу лежат на эскроу, споры решает служба качества по фото «до» и «после»." },
];

export default function PartnerPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Мастерам и партнёрам" }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Работайте мастером, клинером или Сосед.Джуниором рядом с домом</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">Мы ищем мастеров по ремонту техники, сантехников, электриков, клинеров и студентов для мелкой помощи по дому. Подайте анкету: она сразу попадёт на модерацию.</p>
      </section>

      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20"><p.icon className="h-6 w-6 text-white" /></span>
              <div className="mt-4 text-lg font-bold text-ink">{p.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="anketa">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <EarningsCalculator />
          <PartnerForm />
        </div>
      </Section>

      <Section title="Как начать" className="!pt-2">
        <ol className="grid gap-4 sm:grid-cols-4">
          {["Отправьте анкету", "Пройдите проверку и собеседование", "Внесите гарантийный депозит и получите форму", "Принимайте заказы в Telegram-приложении"].map((s, i) => (
            <li key={s} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200/60"><div className="text-3xl font-bold text-emerald-500">{i + 1}</div><div className="mt-2 text-sm font-semibold text-ink">{s}</div></li>
          ))}
        </ol>
      </Section>
    </>
  );
}
