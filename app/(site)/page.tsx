import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CheckCircle2, FileCheck2, Lock, MapPin, ShieldCheck, Shirt, Star, Timer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { APPLIANCE_CATEGORIES, CLEANING_PAGES, REPAIR_SECTIONS, rub } from "@/lib/catalog";
import { Avatar } from "@/components/ui";
import { OrderFlow } from "@/components/site/OrderFlow";
import { ClubWidget } from "@/components/site/SiteLive";
import { JsonLd, Section } from "@/components/site/SiteParts";
import { PHONE } from "@/components/site/SiteChrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Срочный ремонт техники и уборка в вашем ЖК за 30–45 минут | Сосед.pro",
  description: "Ремонт кофемашин, стиральных и посудомоечных машин, сантехника, электрика и уборка от проверенных соседей-мастеров. Фиксированная цена, гарантия 1 год, страховка 100 000 ₽.",
  alternates: { canonical: "/" },
};

const MASTER_NOTES: Record<string, string> = {
  rafael: "ул. Маршала Соколовского, 14 • м. Октябрьское поле / Щукинская",
  alexey: "Сантехник и электрик, соседний корпус",
  elena: "Клинер, соседний подъезд",
  daniil: "Студент МИСИС, проверен службой безопасности",
};

const STANDARDS = [
  { icon: Shirt, title: "Форма, бахилы и коврик", text: "Мастер приходит в форме Votprikid, надевает бахилы и стелет коврик под инструмент. Без этого чек-лист не продолжается." },
  { icon: Camera, title: "Фото «ДО» и «ПОСЛЕ»", text: "Кнопка выплаты в приложении мастера заблокирована, пока нет обоих снимков. Вы видите их в трекинге заказа." },
  { icon: Lock, title: "Безопасная сделка", text: "Деньги заморожены на безопасном счёте и спишутся только после вашего подтверждения. Не понравилось — вернём." },
  { icon: FileCheck2, title: "Гарантия 1 год", text: "Электронная квитанция с номером талона приходит сразу после оплаты. Повторная поломка того же узла чинится бесплатно." },
];

export default async function HomePage() {
  const masters = await prisma.master.findMany({ where: { blocked: false }, orderBy: { createdAt: "asc" } });
  const ld = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Сосед.pro",
    description: "Ремонт бытовой техники, сантехника, электрика и уборка в рамках жилого комплекса",
    telephone: PHONE,
    address: { "@type": "PostalAddress", streetAddress: "ул. Маршала Соколовского, 14", addressLocality: "Москва", addressCountry: "RU" },
    priceRange: "от 400 ₽",
    areaServed: "Москва, СЗАО",
  };

  return (
    <>
      <JsonLd data={ld} />
      {/* Блок 1: Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-canvas">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:py-20">
          <div className="lg:col-span-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70"><ShieldCheck className="h-3.5 w-3.5" /> Сервис класса «Белые перчатки»</span>
            <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">Срочный ремонт техники и уборка в вашем ЖК за 30–45 минут с гарантией 1 год</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">Мастера и клинеры живут в вашем квартале: приезжают быстрее такси, работают за фиксированную цену и отвечают за результат депозитом.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {[["Фиксированная цена", "до начала работ, без доплат на месте"], ["Мастера в бахилах", "и в форме Votprikid"], ["Страховка 100 000 ₽", "на вашу квартиру на время работ"]].map(([t, s]) => (
                <li key={t} className="flex gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200/60">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span><span className="block text-sm font-semibold text-ink">{t}</span><span className="text-xs text-slate-500">{s}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#pult" className="rounded-2xl bg-ink px-6 py-4 text-base font-semibold text-white shadow-lift transition-all hover:bg-ink-800 active:scale-95">Диагностика за 3 шага</Link>
              <Link href="/uborka" className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-ink shadow-soft ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95">Рассчитать уборку</Link>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-[28px] border border-slate-200/60 bg-white p-5 shadow-lift">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" /><span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" /></span> Мастера на линии рядом с вами</div>
              <div className="mt-4 space-y-3">
                {masters.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar id={m.id} emoji={m.avatar} size={44} status={m.status} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{m.name} <span className="text-xs font-normal text-slate-500">• {m.title}</span></div>
                      <div className="truncate text-xs text-slate-500">{m.specialty}</div>
                    </div>
                    <div className="text-right"><div className="tabular text-sm font-bold text-ink">{m.etaMin} мин</div><div className="text-[11px] text-slate-400">до вас</div></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600"><Timer className="h-4 w-4 text-emerald-500" /> Среднее время прибытия по ЖК — 32 минуты</div>
            </div>
          </div>
        </div>
      </section>

      {/* Блок 2: интерактивное ядро */}
      <Section id="pult" title="Закажите прямо здесь: заявка уйдёт мастеру за секунду" lead="Тот же диагностический пульт, что в приложении. После «Вызвать мастера» вы увидите живой трекинг заказа на карте, а заявка мгновенно появится в терминале мастера и в диспетчерской.">
        <OrderFlow />
      </Section>

      {/* Блок 3: витрина категорий */}
      <Section id="services" title="Что ремонтируем и убираем" lead="Цены «от» ориентировочные. Точную смету мастер согласует с вами в приложении до начала работ.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPLIANCE_CATEGORIES.map((c) => (
            <CategoryCard key={c.id} href={`/remont/${c.slug}`} emoji={c.emoji} title={c.seo} from={c.from} tags={[...c.symptoms]} />
          ))}
          {REPAIR_SECTIONS.map((s) => (
            <CategoryCard key={s.slug} href={`/remont/${s.slug}`} emoji={s.emoji} title={s.seo} from={s.from} tags={[...s.symptoms]} />
          ))}
          <CategoryCard href="/uborka" emoji="✨" title="Уборка и клининг" from={1500} tags={["Генеральная уборка", "Мытьё окон", "После ремонта", "Глажка"]} />
        </div>
      </Section>

      {/* Блок 4: мастера */}
      <Section id="masters" title="Реальные мастера вашего района" lead="Каждый прошёл проверку службы безопасности и внёс гарантийный депозит. Если что-то пойдёт не так, вы получите компенсацию из него.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {masters.map((m) => (
            <div key={m.id} className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-soft">
              <Avatar id={m.id} emoji={m.avatar} size={72} status={m.status} />
              <div className="mt-4 text-lg font-bold text-ink">{m.name}</div>
              <div className="text-sm text-slate-500">{m.title}</div>
              <div className="mt-2 flex items-center gap-1.5 text-sm"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><b className="text-ink">{m.rating.toFixed(2)}</b><span className="text-slate-400">• {m.reviews} отзывов</span></div>
              <div className="mt-3 text-sm leading-snug text-slate-600">{m.specialty}</div>
              <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{MASTER_NOTES[m.id] ?? "Ваш район"}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Депозит {rub(m.deposit)} заморожен</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Блок 5: стандарты */}
      <section className="bg-[#0B1120] text-white">
        <Section title="Стандарты «Белые перчатки» и безопасная сделка" lead="Мы не просим верить на слово: каждый шаг фиксируется в приложении, а деньги защищены до вашего подтверждения.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STANDARDS.map((s, i) => (
              <div key={s.title} className="rounded-3xl bg-white/[0.05] p-6 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20"><s.icon className="h-6 w-6 text-white" /></span>
                  <span className="text-3xl font-bold text-white/10">0{i + 1}</span>
                </div>
                <div className="mt-5 text-lg font-bold">{s.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-sm text-slate-400">Подробнее — на странице <Link href="/about" className="font-semibold text-emerald-400 underline-offset-2 hover:underline">«О компании»</Link>.</div>
        </Section>
      </section>

      {/* Блок 6: клуб */}
      <Section id="club" title="Клуб ЖК: душа проекта" lead="Часть каждого заказа и ваши «+50 ₽» идут на бесплатный ремонт для одиноких пенсионеров дома. Книги переходят от соседа к соседу.">
        <ClubWidget />
      </Section>

      <Section title="Уборка под ключ" lead="Выберите тип уборки: у каждой своя страница с чек-листом и калькулятором.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.values(CLEANING_PAGES).map((c) => (
            <Link key={c.slug} href={`/uborka/${c.slug}`} className="rounded-2xl border border-slate-200/60 bg-white p-4 text-sm font-semibold text-ink shadow-soft transition-all hover:shadow-lift active:scale-95">{c.h1}</Link>
          ))}
        </div>
      </Section>
    </>
  );
}

function CategoryCard({ href, emoji, title, from, tags }: { href: string; emoji: string; title: string; from: number; tags: string[] }) {
  return (
    <div className="group relative flex flex-col rounded-3xl border border-slate-200/60 bg-white p-5 shadow-soft transition-all hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">{emoji}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-ink">от {rub(from)}</span>
      </div>
      <Link href={href} className="mt-4 text-lg font-bold text-ink after:absolute after:inset-0">{title}</Link>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700">{t}</span>)}
      </div>
    </div>
  );
}
