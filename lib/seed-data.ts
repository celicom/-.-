import type { PrismaClient } from "@prisma/client";
import { computeSplit, receiptNumber } from "./finance";
import { EXTRA_CODES } from "./error-codes-extra";
import { assembleCodes } from "./data/codes";
import { REGIONS } from "./data/regions";
import { PRICE_ITEMS } from "./data/services";

type Freq = "often" | "sometimes" | "rare";
export type EC = {
  category: string;
  brand: string;
  code: string;
  title: string;
  keywords: string;
  causes: [string, Freq][];
  selfCheck: string[];
  work: [number, number];
  turnkeyTo: number;
  durationMin: number;
  bagHint: string;
  partsFrom?: number;
  partsTo?: number;
};

// Коды ошибок по базе диагностики remontkm.ru (кофемашины и крупная бытовая техника).
const BASE_CODES: EC[] = [
  // ── Кофемашины ──
  {
    category: "coffee", brand: "Jura", code: "Error 8", title: "Заварочный блок не находит исходную позицию",
    keywords: "блок не крутится заварочный щелкает треск error8",
    causes: [["Загустевшая смазка и кофейные масла на направляющих заварочного блока", "often"], ["Износ уплотнителей и ремкомплекта блока", "often"], ["Сбой микропереключателя положения блока", "sometimes"], ["Неисправность редуктора / шестерни мотора блока", "rare"]],
    selfCheck: ["Выключите машину кнопкой и из розетки на 10 минут, затем включите снова.", "Снимите контейнер для жмыха и поддон, очистите отсек от кофейной крошки сухой кисточкой.", "Убедитесь, что дверца сервисного отсека закрыта до щелчка.", "Если ошибка ушла — запустите программу очистки таблеткой Jura."],
    work: [2500, 3500], turnkeyTo: 7500, durationMin: 60,
    bagHint: "Ремкомплект заварочного блока Jura, пищевая силиконовая смазка, сальники, мультиметр, ключ «овал» для корпуса",
  },
  {
    category: "coffee", brand: "Jura", code: "Error 2", title: "Перегрев или неисправность датчика температуры (NTC)",
    keywords: "не греет холодный кофе температура error2",
    causes: [["Окисление разъёма датчика NTC термоблока", "often"], ["Обрыв датчика NTC", "sometimes"], ["Машина стояла на холоде (ниже +5°C)", "sometimes"], ["Неисправность силовой платы", "rare"]],
    selfCheck: ["Если машину привезли с холода — оставьте её выключенной на 2 часа при комнатной температуре.", "Выключите и включите машину из розетки.", "Проверьте, что в баке есть вода и бак установлен до конца."],
    work: [2200, 3200], turnkeyTo: 6500, durationMin: 50,
    bagHint: "Датчик NTC Jura, термопаста, контакт-спрей, мультиметр",
  },
  {
    category: "coffee", brand: "Jura", code: "Заполните систему", title: "Не качает воду / воздушная пробка",
    keywords: "не качает воду насос гудит заполните систему",
    causes: [["Воздушная пробка после замены фильтра", "often"], ["Накипь в клапанах и трубках", "often"], ["Износ помпы ULKA", "sometimes"], ["Заклинивший расходомер", "rare"]],
    selfCheck: ["Снимите фильтр CLARIS и запустите прокачку без него.", "Откройте кран пара/горячей воды и повторите заполнение системы.", "Убедитесь, что клапан на дне бака не залип — нажмите на него пальцем."],
    work: [2000, 3000], turnkeyTo: 6800, durationMin: 55,
    bagHint: "Помпа ULKA EX5, расходомер, лимонная кислота, набор трубок PTFE, хомуты",
  },
  {
    category: "coffee", brand: "DeLonghi", code: "Общая тревога", title: "Красный треугольник / «Общий сигнал тревоги»",
    keywords: "треугольник тревога alarm красный",
    causes: [["Загрязнён или неправильно установлен заварочный блок", "often"], ["Переполнен контейнер жмыха", "often"], ["Сбой датчика уровня воды", "sometimes"], ["Неисправность платы управления", "rare"]],
    selfCheck: ["Выньте и промойте заварочный блок под тёплой водой без моющего средства, высушите.", "Опустошите контейнер жмыха и поддон, установите их до упора.", "Протрите внутреннюю камеру от кофейной пыли."],
    work: [1900, 2900], turnkeyTo: 6200, durationMin: 50,
    bagHint: "Смазка для заварочного блока DeLonghi, уплотнители, датчик уровня воды, отвёртки Torx",
  },
  {
    category: "coffee", brand: "DeLonghi", code: "Добавьте молотый кофе", title: "Машина требует молотый кофе, хотя зёрна есть",
    keywords: "молотый кофе зерна не мелет кофемолка",
    causes: [["Засор жерновов кофемолки маслянистым зерном", "often"], ["Заклинило дозатор", "sometimes"], ["Износ жерновов", "rare"]],
    selfCheck: ["Используйте зерно средней обжарки без масляного блеска.", "Пылесосом аккуратно уберите крошку из бункера.", "Отрегулируйте помол на 1-2 деления крупнее во время работы кофемолки."],
    work: [2200, 3000], turnkeyTo: 5900, durationMin: 50,
    bagHint: "Щётка для жерновов, жернова DeLonghi, пылесос ручной, смазка",
  },
  {
    category: "coffee", brand: "Philips", code: "E03", title: "Заварочный блок заблокирован",
    keywords: "e03 блок застрял",
    causes: [["Блок не смазан более 3 месяцев", "often"], ["Блок установлен не в исходном положении", "often"], ["Износ привода блока", "rare"]],
    selfCheck: ["Выньте блок, нажмите кнопку PUSH и проверьте, что рычаг касается основания.", "Смажьте направляющие оригинальной смазкой.", "Перезапустите машину."],
    work: [1900, 2800], turnkeyTo: 5600, durationMin: 45,
    bagHint: "Смазка Philips HD5061, ремкомплект уплотнителей блока, Torx T10",
  },
  // ── Стиральные машины ──
  {
    category: "washer", brand: "Bosch", code: "E18", title: "Не сливает воду",
    keywords: "не сливает вода стоит e18 f18 слив",
    causes: [["Засор фильтра сливного насоса (монеты, пуговицы)", "often"], ["Перегиб или засор сливного шланга", "often"], ["Неисправность сливного насоса", "sometimes"], ["Засор патрубка между баком и насосом", "rare"]],
    selfCheck: ["Откройте лючок внизу справа, подставьте поддон и выкрутите фильтр насоса против часовой стрелки.", "Очистите фильтр от мусора и проверьте, вращается ли крыльчатка.", "Проверьте сливной шланг на перегибы и сифон под раковиной на засор."],
    work: [1800, 2800], turnkeyTo: 5800, durationMin: 50,
    bagHint: "Сливной насос Bosch 145787, хомуты, плоскогубцы, ветошь, тазик, бахилы",
  },
  {
    category: "washer", brand: "Bosch", code: "E23", title: "Сработал Аквастоп — вода в поддоне",
    keywords: "аквастоп течёт протечка поддон e23",
    causes: [["Протечка из-за пены (много порошка)", "often"], ["Подтекает фильтр насоса", "sometimes"], ["Трещина патрубка или манжеты люка", "sometimes"], ["Неисправный датчик поплавка", "rare"]],
    selfCheck: ["Обесточьте машину и наклоните её назад на 45° — слейте воду из поддона.", "Проверьте, плотно ли закручен фильтр насоса.", "Уменьшите дозировку порошка в 2 раза."],
    work: [1900, 3200], turnkeyTo: 6500, durationMin: 60,
    bagHint: "Манжета люка, патрубки бака, герметик, хомуты, фонарик",
  },
  {
    category: "washer", brand: "LG", code: "OE", title: "Ошибка слива",
    keywords: "oe не сливает",
    causes: [["Засор фильтра насоса", "often"], ["Засор шланга", "sometimes"], ["Неисправность помпы", "sometimes"]],
    selfCheck: ["Откройте лючок внизу слева, слейте воду через аварийный шланг и очистите фильтр.", "Проверьте сливной шланг и сифон."],
    work: [1800, 2600], turnkeyTo: 5200, durationMin: 45,
    bagHint: "Сливной насос LG, хомуты, тазик, ветошь",
  },
  {
    category: "washer", brand: "LG", code: "UE", title: "Дисбаланс барабана",
    keywords: "дисбаланс не отжимает ue стучит прыгает",
    causes: [["Бельё сбилось в ком", "often"], ["Машина стоит не по уровню", "often"], ["Износ амортизаторов", "sometimes"], ["Неисправность датчика Холла", "rare"]],
    selfCheck: ["Распределите бельё равномерно, не стирайте одну тяжёлую вещь отдельно.", "Выставьте машину по уровню регулировкой ножек.", "Проверьте, сняты ли транспортировочные болты."],
    work: [1700, 2800], turnkeyTo: 5600, durationMin: 50,
    bagHint: "Амортизаторы LG, уровень, рожковые ключи 17/19",
  },
  {
    category: "washer", brand: "Samsung", code: "4E", title: "Нет набора воды",
    keywords: "не набирает воду 4e 4c налив",
    causes: [["Закрыт кран подачи воды", "often"], ["Засор сетки заливного клапана", "often"], ["Неисправность заливного клапана", "sometimes"]],
    selfCheck: ["Проверьте, открыт ли кран подачи воды.", "Отсоедините заливной шланг и промойте сетчатый фильтр в клапане.", "Проверьте напор воды из крана в ванной."],
    work: [1600, 2400], turnkeyTo: 4800, durationMin: 40,
    bagHint: "Заливной клапан Samsung, сетка-фильтр, плоскогубцы",
  },
  {
    category: "washer", brand: "Miele", code: "F10", title: "Неисправность налива воды",
    keywords: "f10 налив вода",
    causes: [["Засор фильтров в шланге подачи", "often"], ["Неисправность клапана Waterproof", "sometimes"]],
    selfCheck: ["Промойте фильтры в соединении шланга подачи воды.", "Проверьте, полностью ли открыт кран."],
    work: [2500, 3800], turnkeyTo: 8500, durationMin: 60,
    bagHint: "Клапан Waterproof Miele, сервисный ключ Miele, фильтры",
  },
  // ── Сушильные ──
  {
    category: "dryer", brand: "Bosch", code: "Очистить теплообменник", title: "Плохо сушит / индикатор теплообменника",
    keywords: "плохо сушит влажное теплообменник ворс",
    causes: [["Забит ворсом теплообменник", "often"], ["Засор фильтра в люке", "often"], ["Неисправность датчика влажности", "rare"]],
    selfCheck: ["Очистите сетчатый фильтр в люке.", "Снимите крышку внизу, извлеките теплообменник и промойте его под душем.", "Очистите уплотнители от ворса."],
    work: [1800, 2600], turnkeyTo: 4900, durationMin: 45,
    bagHint: "Мягкая щётка, пылесос, уплотнители теплообменника",
  },
  {
    category: "dryer", brand: "LG", code: "D80", title: "Засор вентиляции на 80%",
    keywords: "d80 d90 d95 вентиляция",
    causes: [["Засорен воздуховод", "often"], ["Перегиб шланга отвода", "sometimes"]],
    selfCheck: ["Очистите фильтр ворса.", "Проверьте шланг отвода на перегибы."],
    work: [1700, 2500], turnkeyTo: 4500, durationMin: 40,
    bagHint: "Пылесос, щётка для воздуховода",
  },
  {
    category: "dryer", brand: "Miele", code: "F44", title: "Ошибка связи модулей",
    keywords: "f44 не включается",
    causes: [["Сбой электроники после скачка напряжения", "sometimes"], ["Окисление разъёмов плат", "sometimes"], ["Неисправность модуля управления", "rare"]],
    selfCheck: ["Обесточьте машину на 15 минут.", "Подключите в другую розетку без удлинителя."],
    work: [2800, 4500], turnkeyTo: 12000, durationMin: 70,
    bagHint: "Сервисный интерфейс Miele, контакт-спрей, мультиметр",
  },
  // ── Посудомоечные ──
  {
    category: "dishwasher", brand: "Bosch", code: "E15", title: "Сработала защита Аквастоп — вода в поддоне",
    keywords: "e15 аквастоп поддон протечка течёт",
    causes: [["Пена от средства для ручного мытья посуды", "often"], ["Протечка из-под распылителя или уплотнителя двери", "sometimes"], ["Трещина в корпусе циркуляционного насоса", "sometimes"], ["Течь шланга подачи", "rare"]],
    selfCheck: ["Обесточьте посудомойку и наклоните её назад под 45°, чтобы вода ушла из поддона.", "Просушите поддон 12 часов феном или естественно.", "Используйте только средства для ПММ, не мойте губкой с фейри посуду перед загрузкой."],
    work: [1900, 3200], turnkeyTo: 7200, durationMin: 60,
    bagHint: "Уплотнитель двери, датчик поплавка Аквастоп, фен, ветошь, герметик, бахилы",
  },
  {
    category: "dishwasher", brand: "Bosch", code: "E09", title: "Нет нагрева воды (помпа с ТЭНом)",
    keywords: "e09 не греет холодная вода нагрев",
    causes: [["Неисправность нагревательного элемента в циркуляционном насосе", "often"], ["Окисление разъёма насоса", "sometimes"], ["Неисправность платы управления", "rare"]],
    selfCheck: ["Перезапустите машину, выключив из розетки на 10 минут.", "Проверьте, что сливной шланг поднят — иначе вода уходит самотёком."],
    work: [2400, 3200], turnkeyTo: 9800, durationMin: 70,
    bagHint: "Циркуляционный насос с ТЭНом Bosch 12014980, мультиметр, хомуты",
  },
  {
    category: "dishwasher", brand: "Bosch", code: "E24", title: "Не сливает воду",
    keywords: "e24 e25 не сливает вода стоит",
    causes: [["Засор фильтра на дне камеры", "often"], ["Засор сливного шланга / сифона", "often"], ["Неисправность сливного насоса", "sometimes"]],
    selfCheck: ["Выньте и промойте фильтр-стакан на дне камеры.", "Ложкой проверните крыльчатку насоса под фильтром — уберите стекло и косточки.", "Проверьте сифон и шланг."],
    work: [1600, 2400], turnkeyTo: 5200, durationMin: 45,
    bagHint: "Сливной насос Bosch, тазик, ветошь, щипцы",
  },
  {
    category: "dishwasher", brand: "Electrolux", code: "i20", title: "Ошибка слива",
    keywords: "i20 20 не сливает",
    causes: [["Засор фильтра", "often"], ["Неисправность насоса", "sometimes"]],
    selfCheck: ["Очистите фильтры на дне камеры.", "Проверьте шланг и сифон."],
    work: [1600, 2400], turnkeyTo: 4900, durationMin: 45,
    bagHint: "Сливной насос Electrolux, ветошь, тазик",
  },
  {
    category: "dishwasher", brand: "Miele", code: "F11", title: "Неисправность слива",
    keywords: "f11 слив",
    causes: [["Засор фильтров", "often"], ["Обратный клапан залип", "sometimes"]],
    selfCheck: ["Очистите комбинированный фильтр.", "Проверьте обратный клапан в сливном насосе."],
    work: [2400, 3600], turnkeyTo: 7900, durationMin: 60,
    bagHint: "Обратный клапан Miele, сливной насос, ветошь",
  },
  // ── Варочные ──
  {
    category: "hob", brand: "Bosch", code: "E2", title: "Перегрев конфорки / электроники",
    keywords: "e2 перегрев выключается индукция",
    causes: [["Перекрыта вентиляция под панелью (ящик вплотную)", "often"], ["Не работает вентилятор охлаждения", "sometimes"], ["Неисправность датчика температуры", "rare"]],
    selfCheck: ["Освободите пространство под варочной панелью, обеспечьте зазор 2 см.", "Дайте панели остыть 30 минут.", "Снимите горячую посуду с сенсорной зоны."],
    work: [2200, 3200], turnkeyTo: 7900, durationMin: 60,
    bagHint: "Вентилятор охлаждения индукции, термопаста, мультиметр, присоска для стекла",
  },
  {
    category: "hob", brand: "Electrolux", code: "E4", title: "Ошибка сенсорного блока",
    keywords: "e4 сенсор не реагирует кнопки",
    causes: [["Залита сенсорная панель", "often"], ["Скачок напряжения", "sometimes"], ["Неисправен сенсорный модуль", "rare"]],
    selfCheck: ["Насухо вытрите панель.", "Обесточьте автомат на 5 минут."],
    work: [2000, 3000], turnkeyTo: 8900, durationMin: 55,
    bagHint: "Сенсорный модуль Electrolux, изопропиловый спирт, мультиметр",
  },
  {
    category: "hob", brand: "Siemens", code: "U400", title: "Неверное подключение / напряжение",
    keywords: "u400 подключение напряжение",
    causes: [["Неправильная схема подключения клеммной колодки", "often"], ["Пониженное напряжение в сети", "sometimes"]],
    selfCheck: ["Не включайте панель, отключите автомат — нужна проверка электриком."],
    work: [1500, 2500], turnkeyTo: 3500, durationMin: 40,
    bagHint: "Мультиметр, перемычки клеммной колодки, кабель ПВС 3x4",
  },
  // ── Духовые ──
  {
    category: "oven", brand: "Bosch", code: "E011", title: "Залипла кнопка / сенсор",
    keywords: "e011 кнопка залипла не включается",
    causes: [["Нажатие кнопки дольше 90 сек / загрязнение", "often"], ["Влага под панелью управления", "sometimes"], ["Неисправность модуля управления", "rare"]],
    selfCheck: ["Протрите панель управления сухой тканью.", "Обесточьте духовку на 5 минут автоматом."],
    work: [1900, 2800], turnkeyTo: 7200, durationMin: 50,
    bagHint: "Модуль управления Bosch, Torx T20, контакт-спрей",
  },
  {
    category: "oven", brand: "Bosch", code: "E115", title: "Перегрев духового шкафа",
    keywords: "e115 перегрев",
    causes: [["Не работает вентилятор охлаждения", "often"], ["Неисправен датчик температуры", "sometimes"]],
    selfCheck: ["Дайте духовке остыть, проверьте, что вентиляционные щели не закрыты."],
    work: [2200, 3200], turnkeyTo: 6900, durationMin: 60,
    bagHint: "Тангенциальный вентилятор Bosch, датчик PT500, мультиметр",
  },
  {
    category: "oven", brand: "Electrolux", code: "Не греет", title: "Духовка не нагревается",
    keywords: "не греет холодная тэн",
    causes: [["Перегорел нижний или верхний ТЭН", "often"], ["Сработал термопредохранитель", "sometimes"], ["Неисправен термостат", "sometimes"]],
    selfCheck: ["Проверьте, не включён ли демо-режим (на дисплее «Demo»).", "Проверьте, что выбран режим нагрева, а не только освещение."],
    work: [1800, 2600], turnkeyTo: 5400, durationMin: 50,
    bagHint: "ТЭН нижний/верхний Electrolux, термопредохранитель, мультиметр",
  },
];

export const ERROR_CODES = assembleCodes([...BASE_CODES, ...EXTRA_CODES]);

export const MASTERS = [
  {
    id: "rafael", name: "Рафаэль", title: "Ведущий инженер", specialty: "Кофемашины и крупная бытовая техника",
    category: "repair", skills: "coffee,washer,dryer,dishwasher,hob,oven", avatar: "👨🏻‍🔧", rating: 4.99, reviews: 412,
    distanceM: 800, etaMin: 25, mapX: 30, mapY: 28, uniform: "Фирменная форма Votprikid",
    badge: "Депозит качества 10 000 ₽ заморожен", deposit: 10000, balance: 18450, inn: "7734•••••812", academyPoints: 340, lessonsDone: "",
    commissionRate: 0.15,
  },
  {
    id: "alexey", name: "Алексей", title: "Мастер-универсал", specialty: "Сантехника и электрика",
    category: "repair", skills: "plumbing,electric,washer", avatar: "🧔🏻", rating: 4.71, reviews: 128,
    distanceM: 1200, etaMin: 35, mapX: 78, mapY: 70, uniform: "Форма Сосед.Про",
    badge: "Депозит 10 000 ₽ заморожен", deposit: 10000, balance: 6200, inn: "7734•••••455", academyPoints: 40, lessonsDone: "",
    commissionRate: 0.15, status: "alert",
  },
  {
    id: "elena", name: "Елена", title: "Фея чистоты", specialty: "Уборка, окна, глажка",
    category: "cleaning", skills: "cleaning", avatar: "👩🏼", rating: 4.96, reviews: 236,
    distanceM: 150, etaMin: 20, mapX: 58, mapY: 40, uniform: "Мятная форма, бахилы, эко-набор",
    badge: "Соседний подъезд", deposit: 10000, balance: 9100, inn: "7734•••••390", academyPoints: 210, lessonsDone: "",
    commissionRate: 0.15,
  },
  {
    id: "daniil", name: "Даниил", title: "Сосед.Джуниор", specialty: "Прикрутить, повесить, собрать",
    category: "junior", skills: "junior", avatar: "👦🏻", rating: 4.92, reviews: 57,
    distanceM: 300, etaMin: 15, mapX: 40, mapY: 64, uniform: "Худи Сосед.Джуниор",
    badge: "Студент МИСИС • проверен СБ", deposit: 6500, balance: 2400, inn: "7734•••••027", academyPoints: 90, lessonsDone: "",
    commissionRate: 0.15,
  },
];

export const BOOKS = [
  { title: "Атомные привычки", author: "Джеймс Клир", kind: "selfdev", ownerName: "Марина", ownerApt: "кв. 54", cover: "🟧" },
  { title: "7 навыков высокоэффективных людей", author: "Стивен Кови", kind: "selfdev", ownerName: "Игорь", ownerApt: "кв. 211", cover: "🟦" },
  { title: "Думай медленно… решай быстро", author: "Даниэль Канеман", kind: "selfdev", ownerName: "Ольга", ownerApt: "кв. 9", cover: "🟨" },
  { title: "Самый богатый человек в Вавилоне", author: "Джордж Клейсон", kind: "selfdev", ownerName: "Тимур", ownerApt: "кв. 133", cover: "🟫" },
  { title: "Пиши, сокращай", author: "Максим Ильяхов, Людмила Сарычева", kind: "selfdev", ownerName: "Анна", ownerApt: "кв. 78", cover: "🟥" },
  { title: "Денискины рассказы", author: "Виктор Драгунский", kind: "kids", ownerName: "Семья Ковалёвых", ownerApt: "кв. 102", cover: "🟩" },
  { title: "Малыш и Карлсон", author: "Астрид Линдгрен", kind: "kids", ownerName: "Светлана", ownerApt: "кв. 45", cover: "🟪" },
  { title: "Муми-тролль и комета", author: "Туве Янссон", kind: "kids", ownerName: "Дмитрий", ownerApt: "кв. 160", cover: "🟦" },
  { title: "Приключения Незнайки", author: "Николай Носов", kind: "kids", ownerName: "Семья Ахмедовых", ownerApt: "кв. 12", cover: "🟨" },
  { title: "Гарри Поттер и философский камень", author: "Дж. К. Роулинг", kind: "kids", ownerName: "Полина", ownerApt: "кв. 199", cover: "🟥", status: "taken", takenBy: "кв. 37" },
];

export const LESSONS = [
  {
    id: "l1", title: "Клиенты на всю жизнь", author: "Карл Сьюэлл", topic: "Сервис", durationMin: 7, points: 120, discount: 0.01,
    summary: "Главная мысль: клиент оценивает не ремонт, а весь опыт общения с вами. Делайте то, что обещали, и вовремя. Если опаздываете — предупредите заранее. Спросите клиента, что для него важно, и повторите вслух. Никогда не спорьте о цене на пороге: смета согласуется в приложении. Уходя, оставьте место чище, чем было. Повторный клиент стоит в пять раз дешевле нового — и он приведёт соседей.",
  },
  {
    id: "l2", title: "Как разговаривать с кем угодно", author: "Лейл Лаундес", topic: "Психология общения", durationMin: 6, points: 100, discount: 0.01,
    summary: "Первые 10 секунд решают всё: улыбка, имя клиента и спокойный тон. Объясняйте поломку простыми словами, без терминов, и показывайте неисправную деталь. Слушайте больше, чем говорите: переспросите симптомы. Если клиент нервничает — признайте его чувства: «Понимаю, без кофемашины утро не то». Завершайте разговор конкретным следующим шагом.",
  },
  {
    id: "l3", title: "Самый богатый человек в Вавилоне", author: "Джордж Клейсон", topic: "Финансовая грамотность", durationMin: 8, points: 120, discount: 0.01,
    summary: "Откладывайте минимум десятую часть каждой выплаты, прежде чем тратить остальное. Пусть деньги работают: гарантийный депозит — ваш первый капитал и защита репутации. Не берите долгов на инструмент, который не окупится за три месяца. Платите налог самозанятого сразу — 4% с физлиц и 6% с компаний, чтобы не копить долг перед ФНС. Учитесь у тех, кто зарабатывает больше вас.",
  },
  {
    id: "l4", title: "Психология влияния", author: "Роберт Чалдини", topic: "Психология общения", durationMin: 9, points: 140, discount: 0.015,
    summary: "Люди доверяют тем, кто похож на них и кто дал что-то первым. Бесплатный совет «Проверьте сами» формирует взаимность. Социальное доказательство — отзывы соседей из вашего ЖК — сильнее любой рекламы. Не давите дефицитом и страхом: честная вилка цен и гарантия на год работают лучше. Последовательность: маленькое согласие ведёт к большому доверию.",
  },
  {
    id: "l5", title: "Сервис от сердца: стандарт «Белые перчатки»", author: "Академия Сосед.Про", topic: "Стандарты", durationMin: 5, points: 80, discount: 0.005,
    summary: "Чистая форма, бахилы и коврик под инструмент — обязательны. Фото «до» и «после» защищают и вас, и клиента от споров. Все расчёты только через приложение: это ваша страховка, гарантия и рейтинг. Расчёт наличными мимо кассы — блокировка и списание депозита. Покажите клиенту, как избежать поломки в будущем — это лучший способ получить пять звёзд.",
  },
  {
    id: "l6", title: "Деньги, которые работают на мастера", author: "Академия Сосед.Про", topic: "Финансовая грамотность", durationMin: 6, points: 100, discount: 0.01,
    summary: "Ведите учёт: доход, запчасти, транспорт и инструмент. Раз в месяц откладывайте на обновление инструмента. Подушка безопасности — три месяца расходов. Рейтинг выше 4.9 даёт больше заказов в вашем ЖК, а комиссия платформы снижается за прохождение Академии — до 10%.",
  },
];

export const GOOD_DEEDS = [
  { title: "Починили стиральную машину", beneficiary: "Галина Петровна, 82 года, кв. 117", cost: 3200, status: "done", masterName: "Рафаэль" },
  { title: "Заменили смеситель на кухне", beneficiary: "Николай Иванович, ветеран труда, кв. 64", cost: 2400, status: "done", masterName: "Алексей" },
  { title: "Генеральная уборка после болезни", beneficiary: "Вера Семёновна, 79 лет, кв. 23", cost: 6500, status: "in_progress", masterName: "Елена" },
  { title: "Повесить поручни в ванной", beneficiary: "Анатолий Фёдорович, 86 лет, кв. 141", cost: 1600, status: "planned", masterName: null },
];

// Детерминированный генератор, чтобы демо-данные были одинаковыми.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const CLIENTS = ["Ирина С.", "Павел К.", "Мария Л.", "Андрей В.", "Екатерина Н.", "Сергей Б.", "Наталья Р.", "Олег Д.", "Юлия М.", "Артём Г."];

export async function seedDatabase(prisma: PrismaClient) {
  await prisma.application.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.master.deleteMany();
  await prisma.errorCode.deleteMany();
  await prisma.region.deleteMany();
  await prisma.priceItem.deleteMany();
  await prisma.book.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.goodDeed.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.complex.deleteMany();

  await prisma.complex.createMany({
    data: [
      { id: "shchukino", name: "ЖК Щукино", address: "ул. Маршала Соколовского, 14" },
      { id: "riverside", name: "ЖК Ривер Парк", address: "ул. Академика Бочвара, 7" },
    ],
  });

  for (const m of MASTERS) await prisma.master.create({ data: m });

  await prisma.errorCode.createMany({ data: ERROR_CODES });
  await prisma.region.createMany({ data: REGIONS });
  await prisma.priceItem.createMany({ data: PRICE_ITEMS });

  await prisma.book.createMany({ data: BOOKS.map((b) => ({ status: "available", ...b })) });
  await prisma.lesson.createMany({ data: LESSONS });
  await prisma.goodDeed.createMany({ data: GOOD_DEEDS });

  // ── История заказов за 30 дней ──
  const rand = rng(42);
  const now = Date.now();
  const plan: { masterId: string; count: number; visitOnly: number }[] = [
    { masterId: "rafael", count: 22, visitOnly: 1 },
    { masterId: "alexey", count: 20, visitOnly: 9 }, // аномалия для ML-антифрода
    { masterId: "elena", count: 16, visitOnly: 0 },
    { masterId: "daniil", count: 10, visitOnly: 1 },
  ];
  let number = 1001;
  let donationsTotal = 0;
  for (const p of plan) {
    const master = MASTERS.find((m) => m.id === p.masterId)!;
    for (let i = 0; i < p.count; i++) {
      // Степень > 1 смещает заказы к последним дням: платформа растёт
      const created = new Date(now - Math.floor(Math.pow(rand(), 1.8) * 27 + 1) * 86400000 - Math.floor(rand() * 10) * 3600000);
      const visitOnly = i < p.visitOnly;
      let kind = "repair", category = "plumbing", categoryLabel = "Сантехника", brand: string | null = null, code: string | null = null, diagnosis = "", work = 0, parts = 0;
      if (p.masterId === "rafael") {
        const pool = ERROR_CODES.filter((c) => c.brand !== "Любая марка");
        const ec = pool[Math.floor(rand() * pool.length)];
        category = ec.category; categoryLabel = ec.category === "coffee" ? "Кофемашина" : "Бытовая техника";
        brand = ec.brand; code = ec.code; diagnosis = `${ec.brand} ${ec.code}: ${ec.title}`;
        work = Math.round((ec.priceWorkFrom + rand() * (ec.priceWorkTo - ec.priceWorkFrom)) / 100) * 100;
        parts = Math.round((ec.partsFrom + rand() * (ec.partsTo - ec.partsFrom)) / 100) * 100;
      } else if (p.masterId === "alexey") {
        const plumbing = rand() > 0.4;
        category = plumbing ? "plumbing" : "electric"; categoryLabel = plumbing ? "Сантехника" : "Электрика";
        diagnosis = plumbing ? "Протечка под раковиной" : "Выбивает автомат";
        work = plumbing ? 1500 + Math.round(rand() * 8) * 100 : 1200 + Math.round(rand() * 10) * 100;
        parts = Math.round(rand() * 15) * 100;
      } else if (p.masterId === "elena") {
        kind = "cleaning"; category = "cleaning"; categoryLabel = "Уборка";
        const rooms = 1 + Math.floor(rand() * 3);
        diagnosis = `${rand() > 0.7 ? "Генеральная" : "Поддерживающая"} уборка, ${rooms}к`;
        work = 2900 + rooms * 1000 + Math.round(rand() * 20) * 100;
      } else {
        kind = "junior"; category = "junior"; categoryLabel = "Сосед.Джуниор";
        diagnosis = rand() > 0.5 ? "Собрать стол" : "Повесить полку";
        work = 600 + Math.round(rand() * 6) * 100;
      }
      const donation = rand() > 0.55 ? 50 : 0;
      const status = visitOnly ? "visit_only" : "done";
      const finalWork = visitOnly ? 500 : work;
      const finalParts = visitOnly ? 0 : parts;
      const order = await prisma.order.create({
        data: {
          number: number++, kind, category, categoryLabel, brand, errorCode: code, diagnosis,
          address: `ул. Маршала Соколовского, 14, кв. ${10 + Math.floor(rand() * 220)}`,
          clientName: CLIENTS[Math.floor(rand() * CLIENTS.length)],
          priceWorkFrom: work, priceWorkTo: work, priceTurnkeyTo: work + parts,
          finalWork, finalParts, donation: visitOnly ? 0 : donation, status, masterId: master.id,
          checklistUniform: true, rating: visitOnly ? null : rand() > 0.15 ? 5 : 4,
          warrantyCode: visitOnly ? null : `SOS-2026-${String(number).padStart(5, "0")}-${Math.floor(rand() * 9000 + 1000)}`,
          surveySent: false,
          assignedAt: created, acceptedAt: new Date(created.getTime() + 60000),
          arrivedAt: new Date(created.getTime() + (18 + Math.floor(rand() * 26)) * 60000),
          completedAt: new Date(created.getTime() + (80 + Math.floor(rand() * 60)) * 60000),
          createdAt: created,
        },
      });
      const split = computeSplit({ work: finalWork, parts: finalParts, donation: visitOnly ? 0 : donation, commissionRate: master.commissionRate, deposit: 10000 });
      donationsTotal += split.donation;
      await prisma.payment.create({ data: { orderId: order.id, receiptNo: receiptNumber(), createdAt: order.completedAt!, ...split } });
    }
  }

  await prisma.donation.createMany({
    data: [
      { amount: 12000, source: "Стартовый взнос УК «Щукино-Сервис»" },
      { amount: 5000, source: "Соседи кв. 88 и 90" },
      { amount: 2400, source: "Сосед.ру: 1% от комиссии за месяц" },
      { amount: donationsTotal, source: "Округления +50 ₽ в заказах" },
    ],
  });

  await prisma.application.createMany({
    data: [
      { name: "Тимур Хасанов", phone: "+79165550142", role: "repair", district: "ЖК Сердце Столицы", experience: "5–10 лет", about: "Ремонт кофемашин Jura и DeLonghi, есть паяльная станция.", createdAt: new Date(now - 3 * 3600000) },
      { name: "Мария Орлова", phone: "+79265550177", role: "cleaning", district: "Октябрьское поле", experience: "2–5 лет", about: "Клининг квартир, своя эко-химия.", createdAt: new Date(now - 26 * 3600000) },
    ],
  });

  // Антифрод уже сработал на истории Алексея: опрос клиентов отправлен.
  await prisma.order.updateMany({ where: { masterId: "alexey", status: "visit_only" }, data: { surveySent: true } });

  await prisma.notification.createMany({
    data: [
      { channel: "system", target: "admin", text: `Демо-данные загружены: ${MASTERS.length} мастера, 68 заказов, ${ERROR_CODES.length} кодов ошибок, ${BOOKS.length} книг.`, delivered: true },
      { channel: "system", target: "антифрод", text: "🚨 Антифрод: у мастера Алексей 45% заказов закрыты «Клиент отказался от ремонта». Подозрение на сделку за наличные мимо кассы!", delivered: true },
      { channel: "system", target: "антифрод", text: "Авто-опрос качества отправлен 9 клиентам мастера Алексей.", delivered: true },
    ],
  });

  await prisma.syncState.upsert({ where: { id: 1 }, create: { id: 1, version: 1 }, update: { version: { increment: 1 } } });
}
