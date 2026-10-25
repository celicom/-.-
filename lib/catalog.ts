// Статический справочник услуг: используется и на клиенте, и на сервере.

// Координаты ПРИБЛИЗИТЕЛЬНЫЕ (центр квартала для карты): уточните их по Яндекс.Картам и поправьте здесь.
export const COMPLEXES = [
  { id: "shchukino", name: "ЖК Щукино", address: "ул. Маршала Соколовского, 14", lat: 55.8035, lon: 37.474 },
  { id: "serdtse-stolitsy", name: "ЖК Сердце Столицы", address: "Шелепихинская наб., 34", lat: 55.7627, lon: 37.5301 },
  { id: "oktyabrskoe-pole", name: "Октябрьское поле", address: "ул. Народного Ополчения, 22", lat: 55.7826, lon: 37.4789 },
];

/** Гиперлокальные страницы /zhk/[slug] */
export const ZHK = [
  {
    slug: "shchukino", lat: 55.8035, lon: 37.474, name: "ЖК Щукино", district: "Щукино, СЗАО", address: "ул. Маршала Соколовского, 14", metro: "Щукинская, Октябрьское поле",
    homes: 18, residents: "≈ 4 200 жителей",
    about: "Квартал между улицами Маршала Соколовского и Маршала Катукова. Здесь живут и работают наши ведущие мастера — от вызова до звонка в дверь обычно меньше 30 минут.",
  },
  {
    slug: "serdtse-stolitsy", lat: 55.7627, lon: 37.5301, name: "ЖК Сердце Столицы", district: "Хорошёво-Мнёвники, СЗАО", address: "Шелепихинская наб., 34", metro: "Шелепиха, Хорошёвская",
    homes: 11, residents: "≈ 6 500 жителей",
    about: "Премиальный квартал на Москве-реке: много встроенной техники Miele, Smeg и Gorenje, кофемашин Jura и DeLonghi. Мастера приезжают с набором для встраиваемых моделей.",
  },
  {
    slug: "oktyabrskoe-pole", lat: 55.7826, lon: 37.4789, name: "Октябрьское поле", district: "Щукино / Хорошёво-Мнёвники", address: "ул. Народного Ополчения, 22", metro: "Октябрьское поле",
    homes: 24, residents: "≈ 9 000 жителей",
    about: "Сталинки, кирпичные дома 60-х и новые башни. Частые заявки — замена смесителей, электрика в старом фонде и генеральная уборка после ремонта.",
  },
] as const;

export const APPLIANCE_CATEGORIES = [
  { id: "coffee", slug: "kofemashiny", label: "Кофемашины", seo: "Ремонт кофемашин", one: "кофемашины", emoji: "☕", from: 1900, symptoms: ["Не варит кофе", "Течёт", "Error 8", "Не мелет зёрна"] },
  { id: "washer", slug: "stiralnye-mashiny", label: "Стиральные", seo: "Ремонт стиральных машин", one: "стиральной машины", emoji: "🌀", from: 1600, symptoms: ["Не сливает", "Не отжимает", "E18", "Стучит при отжиме"] },
  { id: "dryer", slug: "sushilnye-mashiny", label: "Сушильные", seo: "Ремонт сушильных машин", one: "сушильной машины", emoji: "♨️", from: 1700, symptoms: ["Плохо сушит", "Не греет", "D80", "Шумит барабан"] },
  { id: "dishwasher", slug: "posudomoechnye-mashiny", label: "Посудомоечные", seo: "Ремонт посудомоечных машин", one: "посудомоечной машины", emoji: "🍽️", from: 1600, symptoms: ["Ошибка E15", "Не греет воду", "Не сливает", "E24"] },
  { id: "hob", slug: "varochnye-paneli", label: "Варочные", seo: "Ремонт варочных панелей", one: "варочной панели", emoji: "🔥", from: 1500, symptoms: ["Не греет конфорка", "Сенсор не реагирует", "E2", "Выбивает автомат"] },
  { id: "oven", slug: "duhovye-shkafy", label: "Духовые", seo: "Ремонт духовых шкафов", one: "духового шкафа", emoji: "🥧", from: 1800, symptoms: ["Не греет", "Не закрывается дверь", "E011", "Перегрев"] },
] as const;

export const BRANDS: Record<string, string[]> = {
  coffee: ["Jura", "DeLonghi", "Nivona", "Philips", "Saeco", "Miele", "Bosch", "Siemens", "Smeg", "Bork"],
  washer: ["Bosch", "Siemens", "Miele", "LG", "Samsung", "Electrolux", "AEG", "Indesit", "Asko", "Gorenje"],
  dryer: ["Bosch", "Miele", "LG", "Samsung", "Electrolux", "AEG", "Asko"],
  dishwasher: ["Bosch", "Siemens", "Neff", "Miele", "Electrolux", "AEG", "Smeg", "Asko", "Indesit"],
  hob: ["Bosch", "Siemens", "Neff", "Electrolux", "Smeg", "Gorenje", "Bork", "Asko"],
  oven: ["Bosch", "Siemens", "Neff", "Miele", "Electrolux", "AEG", "Smeg", "Gorenje"],
};

export const MIN_ORDER_NOTE = "Минимальный заказ с выездом — от 5 000 ₽, мелкий ремонт от 1 000 ₽ в мастерской. Гарантия 1 год";

export type FixedService = { id: string; label: string; price: number; durationMin: number; bagHint: string; symptoms?: string };

export const PLUMBING: FixedService[] = [
  { id: "mixer", label: "Замена смесителя", price: 1900, durationMin: 50, bagHint: "Разводной ключ, ФУМ-лента, гибкая подводка 40/60 см, прокладки 1/2\"", symptoms: "Капает кран, шатается излив, слабый напор" },
  { id: "leak", label: "Устранить протечку под раковиной", price: 1500, durationMin: 40, bagHint: "Сифон универсальный, прокладки, герметик, ведро и тряпки", symptoms: "Лужа под мойкой, мокрый шкафчик" },
  { id: "toilet", label: "Ремонт бачка унитаза", price: 1700, durationMin: 45, bagHint: "Ремкомплект арматуры бачка, наливной клапан, груша", symptoms: "Постоянно журчит вода, не набирается бачок" },
  { id: "clog", label: "Прочистка засора", price: 1400, durationMin: 40, bagHint: "Трос сантехнический 5 м, вантуз, перчатки, бахилы x2", symptoms: "Вода уходит медленно, запах из слива" },
  { id: "shower", label: "Замена душевой лейки / шланга", price: 900, durationMin: 25, bagHint: "Шланг 1,5 м, прокладки, ключ разводной", symptoms: "Течёт шланг, слабый душ" },
  { id: "washer-connect", label: "Подключить стиральную / посудомоечную машину", price: 2400, durationMin: 60, bagHint: "Кран-тройник, заливной шланг 3 м, сифон с отводом, хомуты", symptoms: "Новая техника, переезд" },
  { id: "heated-rail", label: "Замена полотенцесушителя", price: 4500, durationMin: 120, bagHint: "Американки, байпас, шаровые краны, ФУМ, перфоратор", symptoms: "Подтекает, не греет, старый ржавый" },
  { id: "filter", label: "Установка фильтра под мойку", price: 2200, durationMin: 60, bagHint: "Кран для фильтра, тройник 1/2\", дрель по керамике", symptoms: "Жёсткая вода, накипь в кофемашине" },
];

export const ELECTRIC: FixedService[] = [
  { id: "socket", label: "Замена розетки / выключателя", price: 700, durationMin: 25, bagHint: "Индикаторная отвёртка, клеммы Wago, розетка с заземлением", symptoms: "Искрит, болтается, греется" },
  { id: "lamp", label: "Повесить люстру", price: 1500, durationMin: 50, bagHint: "Стремянка, перфоратор, анкер-крюк, клеммы Wago", symptoms: "Новая люстра, переезд" },
  { id: "breaker", label: "Выбивает автомат — диагностика", price: 1200, durationMin: 40, bagHint: "Мультиметр, токовые клещи, автоматы 16А/25А, УЗО 30 мА", symptoms: "Выбивает при включении техники" },
  { id: "cable", label: "Протянуть кабель / удлинить точку", price: 2200, durationMin: 70, bagHint: "ВВГнг 3x2.5, гофра, распаечная коробка, штроборез", symptoms: "Нужна розетка в новом месте" },
  { id: "hob-connect", label: "Подключить варочную панель / духовку", price: 2500, durationMin: 60, bagHint: "Силовая розетка 32А, ПВС 3x4, клеммы, мультиметр", symptoms: "Новая встраиваемая техника" },
  { id: "spot", label: "Установка точечных светильников", price: 450, durationMin: 15, bagHint: "Коронка 65/75 мм, клеммы Wago, стремянка", symptoms: "Цена за 1 светильник" },
  { id: "panel", label: "Замена автомата / УЗО в щитке", price: 1600, durationMin: 45, bagHint: "Автоматы ABB/Schneider, УЗО 30 мА, гребёнка, отвёртки VDE", symptoms: "Старый щиток, нет защиты от утечки" },
  { id: "doorbell", label: "Установка звонка / домофонной трубки", price: 900, durationMin: 30, bagHint: "Кабель КСПВ, дюбели, звонок", symptoms: "Не работает звонок, новая трубка" },
];

export const JUNIOR: FixedService[] = [
  { id: "shelf", label: "Повесить полку", price: 600, durationMin: 20, bagHint: "Шуруповёрт, дюбели 6 мм, уровень", symptoms: "Полки, крючки, вешалки" },
  { id: "handle", label: "Прикрутить ручку / петлю", price: 400, durationMin: 15, bagHint: "Набор бит, петли-клипсы 35 мм", symptoms: "Перекосилась дверца шкафа" },
  { id: "table", label: "Собрать стол или стул", price: 900, durationMin: 40, bagHint: "Шуруповёрт, шестигранники, киянка", symptoms: "Мебель из IKEA, Hoff, Ozon" },
  { id: "tv", label: "Повесить телевизор", price: 1200, durationMin: 40, bagHint: "Перфоратор, сверло 10 мм, уровень, анкеры", symptoms: "Кронштейн до 65\"" },
  { id: "curtain", label: "Повесить карниз", price: 800, durationMin: 30, bagHint: "Перфоратор, дюбели 8 мм, стремянка", symptoms: "Карнизы, рулонные шторы" },
  { id: "wardrobe", label: "Собрать шкаф", price: 2500, durationMin: 120, bagHint: "Шуруповёрт, набор бит, уровень, киянка, стяжки", symptoms: "Шкаф-купе, распашной" },
  { id: "mirror", label: "Повесить зеркало / картину", price: 500, durationMin: 20, bagHint: "Перфоратор, дюбели, уровень, крючки", symptoms: "До 3 предметов" },
  { id: "silicone", label: "Обновить герметик в ванной", price: 1500, durationMin: 60, bagHint: "Санитарный силикон, нож, обезжириватель", symptoms: "Почернел шов у ванны" },
];

export const REPAIR_SECTIONS = [
  { slug: "santehnika", label: "Сантехника", seo: "Услуги сантехника", items: "plumbing", emoji: "🚰", from: 900, symptoms: ["Капает кран", "Засор", "Течёт под мойкой", "Журчит бачок"] },
  { slug: "elektrika", label: "Электрика", seo: "Услуги электрика", items: "electric", emoji: "💡", from: 450, symptoms: ["Выбивает автомат", "Искрит розетка", "Повесить люстру"] },
  { slug: "muzh-na-chas", label: "Муж на час • Сосед.Джуниор", seo: "Муж на час — Сосед.Джуниор", items: "junior", emoji: "🧰", from: 400, symptoms: ["Повесить полку", "Собрать шкаф", "Повесить телевизор"] },
] as const;

export function fixedList(items: "plumbing" | "electric" | "junior") {
  return items === "plumbing" ? PLUMBING : items === "electric" ? ELECTRIC : JUNIOR;
}

const TRANSLIT: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };

/** ЧПУ для кодов ошибок и брендов: «Error 8» → error-8, «(!)» → warning */
export function slugify(s: string) {
  const out = s
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "warning";
}

export const REPAIR_GROUPS = [
  { id: "appliance", label: "Бытовая техника", emoji: "🔌", hint: "Диагностический пульт по коду ошибки" },
  { id: "plumbing", label: "Сантехника", emoji: "🚰", hint: "Смесители, протечки, засоры" },
  { id: "electric", label: "Электрика", emoji: "💡", hint: "Розетки, люстры, автоматы" },
  { id: "junior", label: "Сосед.Джуниор", emoji: "🧰", hint: "Мелкая помощь от 400 ₽" },
] as const;

export const CLEANING_TYPES = [
  { id: "support", label: "Поддерживающая", base: { 1: 2900, 2: 3900, 3: 4900 }, time: { 1: 150, 2: 200, 3: 260 } },
  { id: "general", label: "Генеральная", base: { 1: 6500, 2: 8900, 3: 11500 }, time: { 1: 300, 2: 400, 3: 520 } },
  { id: "windows", label: "Мытьё окон", base: { 1: 2500, 2: 3500, 3: 4500 }, time: { 1: 90, 2: 130, 3: 170 } },
  { id: "ironing", label: "Глажка", base: { 1: 1500, 2: 1900, 3: 2300 }, time: { 1: 60, 2: 80, 3: 100 } },
  { id: "after-repair", label: "После ремонта", base: { 1: 8900, 2: 11900, 3: 14900 }, time: { 1: 360, 2: 480, 3: 600 } },
] as const;

/** Посадочные /uborka/[type]: что входит в каждый угол квартиры */
export const CLEANING_PAGES: Record<string, { slug: string; h1: string; lead: string; checklist: Record<string, string[]> }> = {
  support: {
    slug: "podderzhivayushchaya", h1: "Поддерживающая уборка квартиры",
    lead: "Раз в неделю или две: чистые полы, кухня и санузел за 2–4 часа. Клинер живёт в вашем ЖК и приходит со своей эко-химией.",
    checklist: {
      "Комнаты": ["Влажная уборка пола и плинтусов", "Пыль со всех доступных поверхностей", "Заправка кровати, смена белья", "Вынос мусора"],
      "Кухня": ["Фасады и столешница", "Плита и фартук", "Раковина и смеситель до блеска", "Микроволновка снаружи и внутри"],
      "Санузел": ["Унитаз, ванна или душ", "Раковина и зеркало", "Пол и плитка до 1,5 м"],
      "Прихожая": ["Обувница и зеркало", "Протирка входной двери и ручек"],
    },
  },
  general: {
    slug: "generalnaya", h1: "Генеральная уборка квартиры",
    lead: "Глубокая уборка каждого угла: от верхних шкафов до швов в плитке. Подходит перед праздником, после болезни или раз в сезон.",
    checklist: {
      "Комнаты": ["Мытьё полов и плинтусов с отодвиганием мебели", "Пыль на шкафах и люстрах", "Мытьё дверей и выключателей", "Чистка батарей"],
      "Кухня": ["Все шкафы внутри и снаружи", "Духовка, вытяжка, холодильник", "Удаление жира с фартука", "Чистка швов плитки"],
      "Санузел": ["Удаление налёта и известкового камня", "Чистка швов и силикона", "Полировка смесителей", "Стены целиком"],
      "Окна и балкон": ["Подоконники и откосы", "Мытьё радиаторов", "Уборка балкона без мытья остекления"],
    },
  },
  windows: {
    slug: "mytie-okon", h1: "Мытьё окон и балконов",
    lead: "Стёкла без разводов с двух сторон, рамы, подоконники и москитные сетки. Работаем с высотными домами ЖК — со страховочным тросом.",
    checklist: {
      "Окна": ["Стёкла с двух сторон", "Рамы и уплотнители", "Подоконники и откосы", "Москитные сетки"],
      "Балкон": ["Остекление изнутри", "Пол и стены", "Удаление паутины"],
    },
  },
  ironing: {
    slug: "glazhka", h1: "Глажка белья и одежды на дому",
    lead: "Рубашки, постельное бельё, шторы. Клинер приходит со своим парогенератором.",
    checklist: { "Глажка": ["Рубашки и блузки", "Постельное бельё", "Шторы и тюль с отпариванием", "Аккуратная укладка в шкаф"] },
  },
  "after-repair": {
    slug: "posle-remonta", h1: "Уборка после ремонта",
    lead: "Строительная пыль, затирка, краска и монтажная пена. Профессиональные пылесосы и безопасная химия для новых поверхностей.",
    checklist: {
      "Все помещения": ["Сбор строительного мусора", "Удаление пыли со стен и потолка", "Отмывание пола от затирки и краски", "Мытьё дверей, розеток, плинтусов"],
      "Кухня и санузел": ["Удаление цементного налёта с плитки", "Отмывание сантехники от герметика", "Шкафы внутри от пыли"],
      "Окна": ["Удаление защитной плёнки и скотча", "Мытьё стёкол и рам"],
    },
  },
};

export function cleaningTypeBySlug(slug: string) {
  const id = Object.keys(CLEANING_PAGES).find((k) => CLEANING_PAGES[k].slug === slug);
  return id ? { id, ...CLEANING_PAGES[id] } : null;
}

export const CLEANING_EXTRAS = [
  { id: "oven", label: "Помыть духовку", price: 900, time: 40 },
  { id: "fridge", label: "Помыть холодильник", price: 800, time: 35 },
  { id: "windows", label: "Окна (до 3 створок)", price: 1500, time: 60 },
  { id: "eco", label: "Эко-химия (гипоаллергенная)", price: 500, time: 0 },
  { id: "balcony", label: "Балкон / лоджия", price: 1200, time: 45 },
] as const;

export function cleaningPrice(typeId: string, rooms: 1 | 2 | 3, extras: string[]) {
  const t = CLEANING_TYPES.find((c) => c.id === typeId) ?? CLEANING_TYPES[0];
  let price = t.base[rooms];
  let time = t.time[rooms];
  for (const e of CLEANING_EXTRAS) {
    if (extras.includes(e.id)) {
      price += e.price;
      time += e.time;
    }
  }
  return { price, time, label: t.label };
}

export const ORDER_STATUS: Record<string, { label: string; tone: "gray" | "blue" | "amber" | "green" | "red" | "violet" }> = {
  searching: { label: "Поиск мастера", tone: "amber" },
  assigned: { label: "Ждём ответа мастера", tone: "amber" },
  accepted: { label: "Мастер в пути", tone: "blue" },
  onsite: { label: "Мастер на месте", tone: "blue" },
  estimate: { label: "Смета на согласовании", tone: "violet" },
  in_progress: { label: "Идёт работа", tone: "blue" },
  awaiting_confirm: { label: "Ждём подтверждения клиента", tone: "violet" },
  done: { label: "Выполнен", tone: "green" },
  visit_only: { label: "Отказ, оплачен выезд", tone: "red" },
  cancelled: { label: "Отменён", tone: "gray" },
};

export const ACTIVE_STATUSES = ["searching", "assigned", "accepted", "onsite", "estimate", "in_progress", "awaiting_confirm"];

export function rub(n: number | null | undefined) {
  return `${(n ?? 0).toLocaleString("ru-RU")} ₽`;
}
