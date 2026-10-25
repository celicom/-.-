"use client";

import { useState } from "react";
import { COMPLEXES } from "@/lib/catalog";
import type { LiveMaster } from "@/lib/live";
import { DistrictMap } from "./DistrictMap";
import { YANDEX_KEY, YandexMap } from "./YandexMap";

type Props = {
  masters: LiveMaster[];
  highlightId?: string | null;
  radar?: boolean;
  routeProgress?: number | null;
  dark?: boolean;
  /** Центр карты: выбранный ЖК. По умолчанию — ЖК «Щукино». */
  center?: { lat: number; lon: number };
  onSelect?: (id: string) => void;
  className?: string;
};

/**
 * Карта района: Яндекс.Карты, если задан NEXT_PUBLIC_YANDEX_MAPS_KEY и API доступен.
 * Без ключа (или если API не загрузился) показывается встроенная схема квартала,
 * чтобы экраны подбора мастера и трекинга продолжали работать.
 */
export function GeoMap({ masters, highlightId, radar, routeProgress, dark, center = COMPLEXES[0], onSelect, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (!YANDEX_KEY || failed) {
    return (
      <div className="relative">
        <DistrictMap masters={masters} highlightId={highlightId} radar={radar} routeProgress={routeProgress} dark={dark} onSelect={onSelect} className={className} />
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-slate-500 shadow">
          {YANDEX_KEY ? "Яндекс.Карты недоступны: схема района" : "Схема района • карта подключится после ключа Яндекс.Карт"}
        </div>
      </div>
    );
  }
  return <YandexMap masters={masters} center={center} highlightId={highlightId} routeProgress={routeProgress} onSelect={onSelect} onFail={() => setFailed(true)} className={className} />;
}
