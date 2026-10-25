import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Camera, FileCheck2, HeartHandshake, Lock, Rocket, Shirt } from "lucide-react";
import { Breadcrumbs, Section } from "@/components/site/SiteParts";
import { PHONE } from "@/components/site/SiteChrome";
import { COMPANY } from "@/src/config/company-legal";

export const metadata: Metadata = {
  title: "О компании Сосед.pro: стандарты «Белые перчатки», партнёрам УК и Сколково",
  description: "Гиперлокальный сервис бытовых услуг в рамках ЖК: проверенные соседи-мастера, эскроу, фотофиксация и гарантия 1 год. Сотрудничество с управляющими компаниями.",
  alternates: { canonical: "/about" },
};

const STANDARDS = [
  { icon: Shirt, t: "Форма, бахилы, коврик", s: "Чистая форма Votprikid, бахилы и коврик под инструмент: обязательный первый шаг чек-листа." },
  { icon: Camera, t: "Фотофиксация «до» и «после»", s: "Без двух фото мастер не может закрыть заказ и получить выплату. Это защищает и клиента, и мастера." },
  { icon: Lock, t: "Эскроу-защита денег", s: "Платёж замораживается и уходит мастеру только после подтверждения клиентом." },
  { icon: FileCheck2, t: "Электронная гарантия 1 год", s: "Талон с уникальным номером приходит сразу после оплаты. Страховка квартиры на время работ — 100 000 ₽." },
  { icon: HeartHandshake, t: "Копилка добрых дел", s: "Часть комиссии и округления клиентов идут на бесплатный ремонт для одиноких пенсионеров дома." },
];

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "О компании" }]} />
      <section className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">О компании Сосед.pro</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">Мы делаем «Uber для дома» в рамках одного жилого комплекса: мастера и клинеры из соседних подъездов, честные цены и деньги под защитой, пока вы не скажете «спасибо».</p>
      </section>

      <Section title="Стандарты «Белые перчатки»">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STANDARDS.map((s) => (
            <div key={s.t} className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50"><s.icon className="h-5 w-5 text-emerald-600" /></span>
              <div className="mt-4 text-lg font-bold text-ink">{s.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.s}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Партнёрам: управляющие компании и Сколково">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-2 text-lg font-bold text-ink"><Building2 className="h-5 w-5 text-indigo-500" /> Управляющим компаниям и ЖК</div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              <li>• Сервис для жителей без затрат УК: мастера работают по стандартам и страхуют имущество.</li>
              <li>• Отдельная страница ЖК, карта мастеров и статистика Копилки добрых дел.</li>
              <li>• Аналитика заявок по дому и SLA прибытия.</li>
            </ul>
            <div className="mt-4 text-sm">Для переговоров: <b className="text-ink">{PHONE}</b></div>
          </div>
          <div className="rounded-3xl bg-ink p-6 text-white shadow-lift">
            <div className="flex items-center gap-2 text-lg font-bold"><Rocket className="h-5 w-5 text-emerald-400" /> Проект для резидентства в Сколково</div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
              <li>• Единая платформа: клиентское PWA, терминал мастера в Telegram, командный пункт и ML-антифрод.</li>
              <li>• Сплит-эквайринг и фискализация самозанятых; эскроу для безопасной сделки.</li>
              <li>• Гиперлокальная модель: плотность мастеров внутри одного ЖК.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="oferta" title="Публичная оферта и реквизиты">
        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 text-sm leading-relaxed text-slate-600 shadow-soft">
          <p><b className="text-ink">{COMPANY.legalName}</b></p>
          <p className="mt-1">ИНН {COMPANY.inn} • КПП {COMPANY.kpp} • ОГРН {COMPANY.ogrn}</p>
          <p className="mt-1">Юридический адрес: {COMPANY.legalAddress}</p>
          <p className="mt-1">{COMPANY.supportEmail} • {COMPANY.phone}</p>
          <p className="mt-3">Оплата услуг производится через безопасную сделку (эскроу): средства списываются после подтверждения клиентом. Гарантийный срок — 12 месяцев с даты оказания услуги. Полные тексты: <Link href="/legal/offer-client" className="font-semibold text-emerald-600 underline-offset-2 hover:underline">публичная оферта для Заказчиков</Link>, <Link href="/legal/offer-master" className="font-semibold text-emerald-600 underline-offset-2 hover:underline">договор для Исполнителей</Link>, <Link href="/legal/privacy" className="font-semibold text-emerald-600 underline-offset-2 hover:underline">политика конфиденциальности</Link>.</p>
          <p className="mt-3">Хотите работать с нами? <Link href="/partner" className="font-semibold text-emerald-600 underline-offset-2 hover:underline">Стать мастером или партнёром</Link>.</p>
        </div>
      </Section>
    </>
  );
}
