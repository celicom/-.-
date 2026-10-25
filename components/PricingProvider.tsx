"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { REGIONS, TIMEZONE_GUESS } from "@/lib/data/regions";
import { PRICE_ITEMS } from "@/lib/data/services";
import { nearestRegion, scaleWork, type ItemLite, type RegionLite } from "@/lib/pricing";
import { subscribeVersion } from "@/lib/sse";

type Ctx = {
  regions: RegionLite[];
  items: ItemLite[];
  region: RegionLite;
  setRegionId: (id: string) => void;
  /** Определить город по геопозиции браузера (запрашивает разрешение). */
  detect: () => Promise<RegionLite | null>;
  /** Цена работы с учётом региона. */
  work: (base: number) => number;
  group: (key: string) => ItemLite[];
  multiplier: number;
};

const KEY = "sosed-region";
const DEFAULT: RegionLite[] = REGIONS;

const PricingContext = createContext<Ctx | null>(null);

/** Региональные цены: выбранный город и таблицы коэффициентов и прайса из базы. */
export function PricingProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<RegionLite[]>(DEFAULT);
  const [items, setItems] = useState<ItemLite[]>(PRICE_ITEMS as ItemLite[]);
  const [regionId, setRegionIdState] = useState("moskva");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { regions: RegionLite[]; items: ItemLite[] };
      if (data.regions?.length) setRegions(data.regions);
      if (data.items?.length) setItems(data.items);
    } catch {
      /* офлайн: остаются встроенные значения */
    }
  }, []);

  useEffect(() => {
    load();
    const off = subscribeVersion(load); // админ поменял коэффициент — цены пересчитываются на глазах
    return off;
  }, [load]);

  // Сохранённый город или первичное автоопределение по часовому поясу (без запроса геопозиции).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return setRegionIdState(saved);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const guess = TIMEZONE_GUESS[tz];
      if (guess) setRegionIdState(guess);
    } catch {}
  }, []);

  const setRegionId = useCallback((id: string) => {
    setRegionIdState(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  }, []);

  const region = regions.find((r) => r.id === regionId) ?? regions[0];

  const detect = useCallback(
    () =>
      new Promise<RegionLite | null>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const r = nearestRegion(regions, pos.coords.latitude, pos.coords.longitude);
            setRegionId(r.id);
            resolve(r);
          },
          () => resolve(null),
          { timeout: 8000, maximumAge: 600000 },
        );
      }),
    [regions, setRegionId],
  );

  const value = useMemo<Ctx>(
    () => ({
      regions, items, region, setRegionId, detect,
      multiplier: region.multiplier,
      work: (base) => scaleWork(base, region.multiplier),
      group: (key) => items.filter((i) => i.groupKey === key).sort((a, b) => a.sort - b.sort),
    }),
    [regions, items, region, setRegionId, detect],
  );

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): Ctx {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error("usePricing вне PricingProvider");
  return ctx;
}
