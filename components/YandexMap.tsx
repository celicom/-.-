"use client";

import { useEffect, useRef, useState } from "react";
import { masterPhoto } from "@/lib/avatars";
import type { LiveMaster } from "@/lib/live";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    ymaps?: any;
  }
}

export const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY ?? "";

let loader: Promise<any> | null = null;
/** Подключает JS API Яндекс.Карт 2.1 один раз на вкладку. */
function loadYMaps(): Promise<any> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.ymaps) return window.ymaps.ready(() => resolve(window.ymaps));
    const s = document.createElement("script");
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_KEY)}&lang=ru_RU`;
    s.async = true;
    s.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
    s.onerror = () => {
      loader = null;
      reject(new Error("Яндекс.Карты недоступны"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** Схематичные смещения мастеров (в % схемы квартала) переводим в метры вокруг центра ЖК. */
export function masterLatLon(m: { mapX: number; mapY: number }, center: { lat: number; lon: number }): [number, number] {
  const dx = ((m.mapX - 58) / 100) * 700; // метров на восток
  const dy = ((58.6 - m.mapY) / 100) * 520; // метров на север
  return [center.lat + dy / 111000, center.lon + dx / (111000 * Math.cos((center.lat * Math.PI) / 180))];
}

const COLOR: Record<string, string> = { free: "#10B981", busy: "#0EA5E9", alert: "#F43F5E" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Ломаная маршрута с изгибом «по улицам» от мастера к дому клиента. */
function routePoints(from: [number, number], to: [number, number]): [number, number][] {
  const mid: [number, number] = [from[0], to[1]]; // Г-образный путь по сетке улиц
  const a: [number, number] = [(from[0] + mid[0]) / 2, (from[1] + mid[1]) / 2];
  return [from, a, mid, [(mid[0] + to[0]) / 2, (mid[1] + to[1]) / 2], to];
}
const along = (pts: [number, number][], t: number): [number, number] => {
  const seg = pts.length - 1;
  const f = Math.min(0.999, Math.max(0, t)) * seg;
  const i = Math.floor(f);
  const k = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
};

type Props = {
  masters: LiveMaster[];
  center: { lat: number; lon: number };
  highlightId?: string | null;
  routeProgress?: number | null;
  onSelect?: (id: string) => void;
  onFail?: () => void;
  className?: string;
};

/** Карта на Яндекс.Картах: пины мастеров с мини-аватаркой и рейтингом, маршрут до дома клиента в реальном времени. */
export function YandexMap({ masters, center, highlightId, routeProgress, onSelect, onFail, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const state = useRef<{ map?: any; pins: Map<string, any>; line?: any; home?: any; done: boolean }>({ pins: new Map(), done: false });
  const [ready, setReady] = useState(false);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    let dead = false;
    loadYMaps()
      .then((ymaps) => {
        if (dead || !box.current) return;
        const map = new ymaps.Map(box.current, { center: [center.lat, center.lon], zoom: 16, controls: ["zoomControl"] }, { suppressMapOpenBlock: true });
        map.behaviors.disable("scrollZoom");
        state.current.map = map;
        state.current.home = new ymaps.Placemark([center.lat, center.lon], { hintContent: "Дом клиента" }, { preset: "islands#darkGreenHomeCircleIcon" });
        map.geoObjects.add(state.current.home);
        setReady(true);
      })
      .catch(() => onFail?.());
    return () => {
      dead = true;
      state.current.map?.destroy();
      state.current = { pins: new Map(), done: false };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { map, home } = state.current;
    if (!ready || !map) return;
    home.geometry.setCoordinates([center.lat, center.lon]);
    map.setCenter([center.lat, center.lon], 16, { duration: 300 });
  }, [ready, center.lat, center.lon]);

  useEffect(() => {
    const ymaps = window.ymaps;
    const s = state.current;
    if (!ready || !s.map || !ymaps) return;
    const target = masters.find((m) => m.id === highlightId);
    const home: [number, number] = [center.lat, center.lon];
    const seen = new Set<string>();

    for (const m of masters) {
      seen.add(m.id);
      const base = masterLatLon(m, center);
      const pts = routePoints(base, home);
      const coords = m.id === highlightId && routeProgress != null ? along(pts, routeProgress) : base;
      const photo = masterPhoto(m.id);
      const color = COLOR[m.status] ?? COLOR.free;
      const dim = highlightId && m.id !== highlightId;
      const html = `<div style="position:relative;opacity:${dim ? 0.45 : 1};transform:translate(-26px,-58px);width:52px;font-family:Onest,system-ui,sans-serif">
        <div style="width:48px;height:48px;border-radius:50%;border:3px solid ${color};background:#fff url('${photo ?? ""}') center/cover;box-shadow:0 6px 16px rgba(15,23,42,.3)"></div>
        <div style="position:absolute;right:-6px;top:-4px;background:#0F172A;color:#fff;border-radius:9px;padding:1px 5px;font-size:10px;font-weight:700">★${m.rating.toFixed(1)}</div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:-18px;background:#fff;color:#0F172A;border-radius:9px;padding:1px 7px;font-size:10px;font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,.25);white-space:nowrap">${esc(m.name)}</div>
      </div>`;
      let pin = s.pins.get(m.id);
      const layout = ymaps.templateLayoutFactory.createClass(html);
      if (!pin) {
        pin = new ymaps.Placemark(coords, { hintContent: `${m.name} • ★${m.rating.toFixed(2)}` }, { iconLayout: layout, iconShape: { type: "Rectangle", coordinates: [[-26, -58], [26, 0]] } });
        pin.events.add("click", () => selectRef.current?.(m.id));
        s.map.geoObjects.add(pin);
        s.pins.set(m.id, pin);
      } else {
        pin.options.set("iconLayout", layout);
        pin.geometry.setCoordinates(coords);
      }
    }
    for (const [id, pin] of s.pins) if (!seen.has(id)) { s.map.geoObjects.remove(pin); s.pins.delete(id); }

    // маршрут от текущей точки мастера до адреса клиента
    if (target && routeProgress != null) {
      const pts = routePoints(masterLatLon(target, center), home);
      const now = along(pts, routeProgress);
      const rest = [now, ...pts.filter((_, i) => i / (pts.length - 1) > routeProgress)];
      if (!s.line) {
        s.line = new ymaps.Polyline(rest, {}, { strokeColor: "#10B981", strokeWidth: 6, strokeOpacity: 0.9, strokeStyle: "shortdash" });
        s.map.geoObjects.add(s.line);
      } else s.line.geometry.setCoordinates(rest);
    } else if (s.line) {
      s.map.geoObjects.remove(s.line);
      s.line = undefined;
    }
  }, [ready, masters, highlightId, routeProgress, center]);

  return (
    <div className={`relative ${className}`}>
      <div ref={box} className="h-[300px] w-full bg-slate-100" />
      {!ready && <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-400">Загружаем Яндекс.Карты…</div>}
    </div>
  );
}
