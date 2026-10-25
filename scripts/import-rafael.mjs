// Импорт настоящей базы кодов ошибок и цен из сайта мастера Рафаэля (папка rafael-site).
// Запуск:  node scripts/import-rafael.mjs "C:\Users\a7050\Desktop\rafael-site"
// Результат: lib/data/rafael-codes.json (его читает сидирование базы).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = process.argv[2] || path.join(process.env.USERPROFILE || "", "Desktop", "rafael-site");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "data", "rafael-codes.json");
const ANY = "Любая марка";

const diag = JSON.parse(fs.readFileSync(path.join(SRC, "content", "diag.json"), "utf8"));
const byId = Object.fromEntries(diag.items.map((i) => [i.id, i]));

// какая страница сайта Рафаэля описывает какую запись и для каких марок
const MAP = {
  "jura-e8": { page: "kod-jura-error-8", rows: [["Jura", "Error 8"]] },
  "jura-e25": { page: "kod-jura-error-2-5", rows: [["Jura", "Error 2 / 5"]] },
  "dl-alarm": { page: "kod-delonghi-alarm", rows: [["DeLonghi", "(!)"]] },
  "dl-grind": { page: "kod-delonghi-melkiy-pomol", rows: [["DeLonghi", "Мелкий помол / нет воды"]] },
  "ph-e01": { page: "kod-philips-saeco-e01-e05", rows: [["Philips", "E01 / E03 / E04 / E05"], ["Saeco", "E01 / E03 / E04 / E05"]] },
  "bosch-e0510": { page: "kod-bosch-siemens-e0510", rows: [["Bosch", "E0510 / E0531 / E6100"], ["Siemens", "E0510 / E0531 / E6100"], ["Neff", "E0510 / E0531 / E6100"]] },
  milk: { rows: [[ANY, "Не взбивает молоко / нет пара"]] },
  "coffee-service": { rows: [[ANY, "Чистка и ТО"]] },
  "dw-e15": { page: "kod-bosch-e15", rows: [["Bosch", "E15"], ["Siemens", "E15"], ["Neff", "E15"]] },
  "dw-e09": { page: "kod-bosch-e09", rows: [["Bosch", "E09"]] },
  "dw-e24": { page: "kod-bosch-e24-i20", rows: [["Bosch", "E24 / E25 / i20"]] },
  "dw-f70": { page: "kod-miele-f70-f11", rows: [["Miele", "F70 / F11"]] },
  "hob-e6": { page: "kod-electrolux-hob-e6-e8-e9", rows: [["Electrolux", "E6 / E8 / E9"], ["AEG", "E6 / E8 / E9"], ["Bosch", "E6 / E8 / E9"]] },
  "hob-er22": { page: "kod-varochnaya-er22-u400", rows: [[ANY, "Er 22 / U400 / F0 / F4"]] },
  "hob-pot": { rows: [[ANY, "Не видит посуду / трещит / отключается"]] },
  "ov-heat": { rows: [[ANY, "Не греет верх / низ / конвекция"]] },
  "ov-er01": { page: "kod-duhovka-er01-f01-f11", rows: [[ANY, "Er 01 / F01 / F11 / E005"]] },
  "ov-door": { rows: [[ANY, "Не закрывается дверца / провисла"]] },
  "w-oe": { rows: [] }, // ниже: отдельные страницы LG OE, Bosch E18, Indesit F05
  "w-f21": { page: "kod-stiralnaya-f21-e08-le", rows: [[ANY, "F21 / E08 / LE"]] },
  "w-h1": { page: "kod-stiralnaya-h1-e05-f19", rows: [[ANY, "H1 / E05 / F19"]] },
  "w-noise": { rows: [[ANY, "Гудит и гремит при отжиме"]] },
  "d-wet": { rows: [[ANY, "Бельё влажное / не сушит"]] },
  "d-water": { rows: [[ANY, "Переполнен контейнер конденсата"]] },
  "d-e60": { page: "kod-sushilnaya-e60-e62-f66", rows: [[ANY, "E60 / E62 / F66"]] },
  "d-drum": { rows: [[ANY, "Не крутится барабан / скрипит"]] },
};
// страницы-коды без своей записи в diag.json: цена берётся у ближайшей по смыслу записи (w-oe)
const EXTRA_PAGES = [
  { page: "kod-lg-oe", device: "washer", brand: "LG", code: "OE", like: "w-oe", title: "Не сливает воду" },
  { page: "kod-bosch-e18", device: "washer", brand: "Bosch", code: "E18 / F18", like: "w-oe", title: "Не сливает воду" },
  { page: "kod-indesit-f05", device: "washer", brand: "Indesit", code: "F05", like: "w-oe", title: "Не сливает воду" },
  {
    page: "kod-samsung-4e", device: "washer", brand: "Samsung", code: "4E / 4C", like: "w-oe", title: "Нет набора воды",
    causes: [["Закрыт кран или упал напор воды", "often"], ["Забита сетка заливного клапана", "often"], ["Неисправен заливной клапан", "sometimes"]],
  },
];

const num = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const items = (h) => [...h.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1]));

function parsePage(name) {
  const file = path.join(SRC, "content", "pages", `${name}.html`);
  if (!fs.existsSync(file)) return {};
  const t = fs.readFileSync(file, "utf8");
  const body = t.split(/\n---\s*\n/)[1] ?? "";
  const sections = {};
  for (const m of body.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/g)) {
    const h2 = m[1].match(/<h2>([\s\S]*?)<\/h2>/);
    if (h2) sections[strip(h2[1])] = m[1];
  }
  const get = (title) => Object.entries(sections).find(([k]) => k.toLowerCase().startsWith(title.toLowerCase()))?.[1] ?? "";
  const paras = (h) => [...h.matchAll(/<p(?: [^>]*)?>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1])).filter(Boolean);
  const self = get("Что проверить самому");
  const tip = self.match(/<p class="tip">([\s\S]*?)<\/p>/);
  const faqHtml = get("Частые вопросы");
  const faq = [...faqHtml.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => ({ q: strip(m[1]), a: strip(m[2]) }));
  return {
    meaning: paras(get("Что означает код")).join("\n\n"),
    selfCheck: [...items(self), ...(tip ? [strip(tip[1])] : [])],
    masterSteps: items(get("Как чинит мастер")),
    whenMaster: items(get("Когда нужен мастер")),
    faq,
  };
}

function prices(item) {
  const work = num(item.work);
  const [a, b] = String(item.total).split(/[–-]/).map(num);
  const totalFrom = a || 0;
  const totalTo = b || a || 0;
  if (!work) return { workFrom: totalFrom, workTo: totalTo, partsFrom: 0, partsTo: 0 }; // фиксированная цена «чистка и ТО»
  return { workFrom: work, workTo: work, partsFrom: Math.max(0, totalFrom - work), partsTo: Math.max(0, totalTo - work) };
}
const minutes = (t) => {
  const m = String(t || "").match(/(\d+)\D+(\d+)/);
  return m ? Math.round((Number(m[1]) + Number(m[2])) / 2) : 0;
};

const rows = [];
const push = (device, brand, code, item, extra) => {
  const page = extra.page ? parsePage(extra.page) : {};
  rows.push({
    category: device, brand, code, title: item.title, kind: item.kind ?? "code",
    causes: extra.causes ?? item.causes,
    selfCheck: page.selfCheck?.length ? page.selfCheck : [item.check],
    ...prices(item), minutes: minutes(item.time),
    meaning: page.meaning ?? "", masterSteps: page.masterSteps ?? [], whenMaster: page.whenMaster ?? [], faq: page.faq ?? [],
    source: "rafael", verified: true,
  });
};

for (const item of diag.items) {
  const m = MAP[item.id];
  if (!m) { console.warn("нет правила для", item.id); continue; }
  for (const [brand, code] of m.rows) push(item.device, brand, code, item, m);
}
for (const e of EXTRA_PAGES) {
  const like = byId[e.like];
  push(e.device, e.brand, e.code, { ...like, title: e.title, kind: "code" }, e);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1), "utf8");
console.log(`Готово: ${rows.length} записей → ${OUT}`);
console.log(`С подробным текстом со страниц: ${rows.filter((r) => r.meaning).length}`);
