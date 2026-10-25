"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import type { LiveMaster } from "@/lib/live";
import { masterPhoto } from "@/lib/avatars";

const W = 400;
const H = 300;
/** Подъезд клиента (ул. Маршала Соколовского, 14) */
export const HOME = { x: 232, y: 176 };

const STATUS_COLOR: Record<string, string> = { free: "#10B981", busy: "#0EA5E9", alert: "#F43F5E" };

type Props = {
  masters: LiveMaster[];
  highlightId?: string | null;
  radar?: boolean;
  /** 0 — мастер на старте, 1 — у подъезда клиента */
  routeProgress?: number | null;
  dark?: boolean;
  className?: string;
  onSelect?: (id: string) => void;
};

const pos = (m: { mapX: number; mapY: number }) => ({ x: (m.mapX / 100) * W, y: (m.mapY / 100) * H });

function control(a: { x: number; y: number }) {
  // Изгиб маршрута «по улицам»
  return { x: (a.x + HOME.x) / 2 + (HOME.y - a.y) * 0.25, y: (a.y + HOME.y) / 2 - (HOME.x - a.x) * 0.25 };
}
function bezier(a: { x: number; y: number }, t: number) {
  const c = control(a);
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * HOME.x, y: u * u * a.y + 2 * u * t * c.y + t * t * HOME.y };
}

// Кварталы: [x, y, w, h]
const BUILDINGS = [
  [18, 18, 52, 34], [84, 14, 38, 42], [136, 18, 58, 30], [18, 92, 40, 46], [72, 96, 54, 38], [140, 92, 46, 42],
  [272, 96, 50, 34], [336, 98, 48, 40], [18, 190, 46, 36], [80, 196, 50, 30], [150, 196, 40, 34], [282, 190, 44, 38], [340, 196, 44, 30],
];
const TREES = [[268, 26], [286, 40], [304, 24], [322, 44], [344, 30], [362, 48], [376, 22], [296, 58], [336, 62], [358, 70]];

/** Стилизованная векторная карта квартала ЖК «Щукино» с фото-пинами мастеров и живым маршрутом. */
export function DistrictMap({ masters, highlightId, radar, routeProgress, dark, className = "", onSelect }: Props) {
  const uid = useId().replace(/:/g, "");
  const c = dark
    ? { bg: "#0B1324", grid: "#111C33", block: "#16233D", blockTop: "#1C2B4A", road: "#1E2D4D", line: "#2C4068", park: "#0F2A22", tree: "#14532D", water: "#0C2A4A", label: "#64748B", chip: "#0F172A", chipText: "#E2E8F0" }
    : { bg: "#EEF2F6", grid: "#E6EBF1", block: "#DCE3EC", blockTop: "#F4F7FA", road: "#FFFFFF", line: "#F8D98A", park: "#D5F0DF", tree: "#9ED9B5", water: "#C7DDF5", label: "#94A3B8", chip: "#FFFFFF", chipText: "#0F172A" };
  const target = masters.find((m) => m.id === highlightId);
  const p = Math.min(1, Math.max(0, routeProgress ?? 0));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`block w-full ${className}`} role="img" aria-label="Карта квартала">
      <defs>
        <pattern id={`grid-${uid}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke={c.grid} strokeWidth="1" />
        </pattern>
        <linearGradient id={`water-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor={c.water} />
          <stop offset="1" stopColor={dark ? "#123a63" : "#B3D1F2"} />
        </linearGradient>
        <linearGradient id={`route-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <filter id={`shadow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect width={W} height={H} fill={c.bg} />
      <rect width={W} height={H} fill={`url(#grid-${uid})`} />

      {/* Парк */}
      <rect x="256" y="12" width="132" height="70" rx="14" fill={c.park} />
      {TREES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 7 : 5} fill={c.tree} opacity="0.9" />
      ))}
      <text x="322" y="78" fontSize="9" textAnchor="middle" fill={c.label} fontWeight="600" letterSpacing="0.5">ПАРК «ЩУКИНО»</text>

      {/* Москва-река */}
      <path d={`M0 262 C 70 240, 120 288, 200 268 S 330 244, 400 266 L400 300 L0 300 Z`} fill={`url(#water-${uid})`} />
      <text x="300" y="288" fontSize="8.5" fill={dark ? "#3B82F6" : "#5B8BC9"} fontStyle="italic">Москва-река</text>

      {/* Дороги */}
      <g strokeLinecap="round">
        <line x1="0" y1="72" x2="400" y2="72" stroke={c.road} strokeWidth="14" />
        <line x1="0" y1="72" x2="400" y2="72" stroke={c.line} strokeWidth="1.2" strokeDasharray="8 7" />
        <line x1="0" y1="168" x2="400" y2="168" stroke={c.road} strokeWidth="14" />
        <line x1="0" y1="168" x2="400" y2="168" stroke={c.line} strokeWidth="1.2" strokeDasharray="8 7" />
        <line x1="206" y1="0" x2="206" y2="250" stroke={c.road} strokeWidth="12" />
        <line x1="206" y1="0" x2="206" y2="250" stroke={c.line} strokeWidth="1.2" strokeDasharray="8 7" />
        <line x1="76" y1="72" x2="76" y2="250" stroke={c.road} strokeWidth="7" />
        <line x1="134" y1="0" x2="134" y2="168" stroke={c.road} strokeWidth="7" />
        <line x1="332" y1="72" x2="332" y2="250" stroke={c.road} strokeWidth="7" />
        <line x1="206" y1="240" x2="400" y2="240" stroke={c.road} strokeWidth="6" />
      </g>
      <text x="10" y="64" fontSize="8" fill={c.label} fontWeight="600">ул. Маршала Соколовского</text>
      <text x="10" y="160" fontSize="8" fill={c.label} fontWeight="600">ул. Маршала Катукова</text>
      <text x="214" y="12" fontSize="8" fill={c.label} fontWeight="600">ул. Щукинская</text>

      {/* Дома с «объёмом» */}
      {BUILDINGS.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x + 2} y={y + 3} width={w} height={h} rx="5" fill={c.block} />
          <rect x={x} y={y} width={w} height={h} rx="5" fill={c.blockTop} stroke={c.block} strokeWidth="1" />
        </g>
      ))}

      {/* Дом клиента */}
      <g filter={`url(#shadow-${uid})`}>
        <rect x="216" y="184" width="54" height="44" rx="7" fill="#0F172A" />
        <rect x="222" y="190" width="42" height="4" rx="2" fill="#10B981" opacity="0.8" />
        <text x="243" y="212" fontSize="8" textAnchor="middle" fill="#fff" fontWeight="700">Соколовского</text>
        <text x="243" y="222" fontSize="8" textAnchor="middle" fill="#94A3B8" fontWeight="600">дом 14</text>
      </g>

      {/* Радар */}
      {radar &&
        [0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={HOME.x}
            cy={HOME.y}
            fill="#10B981"
            fillOpacity="0.06"
            stroke="#10B981"
            strokeWidth="1.2"
            initial={{ r: 10, opacity: 0.9 }}
            animate={{ r: 190, opacity: 0 }}
            transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.05, ease: "easeOut" }}
          />
        ))}

      {/* Маршрут */}
      {target && routeProgress != null && (() => {
        const a = pos(target);
        const k = control(a);
        const d = `M${a.x} ${a.y} Q${k.x} ${k.y} ${HOME.x} ${HOME.y}`;
        return (
          <g>
            <path d={d} fill="none" stroke="#0F172A" strokeOpacity="0.12" strokeWidth="9" strokeLinecap="round" />
            <motion.path d={d} fill="none" stroke={`url(#route-${uid})`} strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeInOut" }} />
            <path d={d} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="4 6" strokeLinecap="round" className="animate-dash" opacity="0.9" />
          </g>
        );
      })()}

      {/* Пин «Вы здесь» */}
      <g transform={`translate(${HOME.x} ${HOME.y})`}>
        <motion.circle r="14" fill="#10B981" initial={{ opacity: 0.35, scale: 0.6 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 2, repeat: Infinity }} />
        <circle r="7" fill="#fff" filter={`url(#shadow-${uid})`} />
        <circle r="4.5" fill="#10B981" />
      </g>

      {/* Мастера */}
      {masters.map((m) => {
        const start = pos(m);
        const moving = m.id === highlightId && routeProgress != null;
        const at = moving ? bezier(start, p) : start;
        const color = STATUS_COLOR[m.status] ?? "#10B981";
        const dim = highlightId && m.id !== highlightId;
        const photo = masterPhoto(m.id, 96);
        return (
          <motion.g
            key={m.id}
            initial={false}
            animate={{ x: at.x, y: at.y, opacity: dim ? 0.4 : 1 }}
            transition={{ type: "spring", stiffness: 50, damping: 16 }}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            onClick={() => onSelect?.(m.id)}
          >
            <motion.circle r="20" fill={color} initial={{ opacity: 0.35, scale: 0.8 }} animate={{ opacity: 0, scale: 1.7 }} transition={{ duration: 1.8, repeat: Infinity, delay: (m.mapX % 10) / 10 }} />
            <circle r="17" fill="#fff" stroke={color} strokeWidth="2.5" filter={`url(#shadow-${uid})`} />
            <clipPath id={`clip-${uid}-${m.id}`}>
              <circle r="14" />
            </clipPath>
            {photo ? (
              <image href={photo} x="-14" y="-14" width="28" height="28" clipPath={`url(#clip-${uid}-${m.id})`} preserveAspectRatio="xMidYMid slice" />
            ) : (
              <text fontSize="16" textAnchor="middle" dominantBaseline="central">{m.avatar}</text>
            )}
            <circle cx="12" cy="12" r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
            <g transform="translate(0 30)">
              <rect x={-m.name.length * 3.3 - 7} y="-8" width={m.name.length * 6.6 + 14} height="16" rx="8" fill={c.chip} filter={`url(#shadow-${uid})`} />
              <text fontSize="9" textAnchor="middle" dominantBaseline="central" fill={c.chipText} fontWeight="700">{m.name}</text>
            </g>
          </motion.g>
        );
      })}
    </svg>
  );
}
