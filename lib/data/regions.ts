export type RegionRow = { id: string; name: string; tier: "moscow" | "tier1" | "tier2" | "tier3"; multiplier: number; lat: number; lon: number; sort: number };

export const TIER_LABEL: Record<RegionRow["tier"], string> = {
  moscow: "Москва и МО",
  tier1: "Мегаполисы Tier-1",
  tier2: "Города-миллионники Tier-2",
  tier3: "Регионы Tier-3",
};

export const TIER_DEFAULT: Record<RegionRow["tier"], number> = { moscow: 1, tier1: 0.85, tier2: 0.7, tier3: 0.6 };

// [id, название, группа, широта, долгота]
const CITIES: [string, string, RegionRow["tier"], number, number][] = [
  ["moskva", "Москва", "moscow", 55.7558, 37.6173],
  ["krasnogorsk", "Красногорск", "moscow", 55.8317, 37.3295],
  ["himki", "Химки", "moscow", 55.897, 37.4297],
  ["odincovo", "Одинцово", "moscow", 55.6783, 37.2777],
  ["mytischi", "Мытищи", "moscow", 55.9105, 37.7363],
  ["sankt-peterburg", "Санкт-Петербург", "tier1", 59.9343, 30.3351],
  ["sochi", "Сочи", "tier1", 43.5855, 39.7231],
  ["kazan", "Казань", "tier1", 55.7961, 49.1064],
  ["ekaterinburg", "Екатеринбург", "tier1", 56.8389, 60.6057],
  ["novosibirsk", "Новосибирск", "tier2", 55.0084, 82.9357],
  ["krasnodar", "Краснодар", "tier2", 45.0355, 38.9753],
  ["nizhniy-novgorod", "Нижний Новгород", "tier2", 56.2965, 43.9361],
  ["samara", "Самара", "tier2", 53.1959, 50.1002],
  ["ufa", "Уфа", "tier2", 54.7388, 55.9721],
  ["rostov-na-donu", "Ростов-на-Дону", "tier2", 47.2357, 39.7015],
  ["chelyabinsk", "Челябинск", "tier2", 55.1644, 61.4368],
  ["voronezh", "Воронеж", "tier3", 51.6605, 39.2003],
  ["perm", "Пермь", "tier3", 58.0105, 56.2502],
  ["volgograd", "Волгоград", "tier3", 48.708, 44.5133],
  ["saratov", "Саратов", "tier3", 51.5336, 46.0343],
  ["tyumen", "Тюмень", "tier3", 57.1522, 65.5272],
  ["kaliningrad", "Калининград", "tier3", 54.7104, 20.4522],
  ["yaroslavl", "Ярославль", "tier3", 57.6261, 39.8845],
];

export const REGIONS: RegionRow[] = CITIES.map(([id, name, tier, lat, lon], sort) => ({ id, name, tier, multiplier: TIER_DEFAULT[tier], lat, lon, sort }));

/** Подсказка по часовому поясу браузера для первичного автоопределения (без запроса геопозиции). */
export const TIMEZONE_GUESS: Record<string, string> = {
  "Europe/Moscow": "moskva",
  "Europe/Kaliningrad": "kaliningrad",
  "Europe/Samara": "samara",
  "Asia/Yekaterinburg": "ekaterinburg",
  "Asia/Novosibirsk": "novosibirsk",
  "Europe/Volgograd": "volgograd",
  "Europe/Saratov": "saratov",
};
