"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState } from "./state";
import { subscribeStatus, subscribeVersion } from "./sse";

// Даты после JSON превращаются в строки.
type J<T> = T extends Date ? string : T extends (infer U)[] ? J<U>[] : T extends object ? { [K in keyof T]: J<T[K]> } : T;

export type Live = J<AppState>;
export type LiveOrder = Live["orders"][number];
export type LiveMaster = Live["masters"][number];

/**
 * Живое состояние платформы: первая загрузка + подписка на SSE /api/stream.
 * Любое изменение в любом окне мгновенно отражается во всех остальных.
 */
export function useLive() {
  const [state, setState] = useState<Live | null>(null);
  const [connected, setConnected] = useState(false);
  const reqId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = (await res.json()) as Live;
      if (id === reqId.current) setState(data);
    } catch {
      /* сервер перезапускается — SSE переподключится сам */
    }
  }, []);

  useEffect(() => {
    reload();
    const offV = subscribeVersion(reload);
    const offS = subscribeStatus(setConnected);
    const fallback = setInterval(reload, 10000);
    return () => {
      offV();
      offS();
      clearInterval(fallback);
    };
  }, [reload]);

  return { state, reload, connected };
}

export async function api<T = unknown>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Ошибка сервера");
  return data as T;
}

export const orderAction = (id: string, body: Record<string, unknown>) => api(`/api/orders/${id}`, "PATCH", body);
export const masterAction = (id: string, body: Record<string, unknown>) => api(`/api/masters/${id}`, "PATCH", body);

/** Сжимает фото до 1024px JPEG, чтобы хранить его в базе как data URL. */
export function compressImage(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      stamp(ctx, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    img.src = url;
  });
}

/** Водяной знак с датой и временем — защищает от подмены старыми фото. */
function stamp(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const text = `Сосед.Про • ${new Date().toLocaleString("ru-RU")}`;
  ctx.font = `${Math.max(14, Math.round(w / 40))}px sans-serif`;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(w - tw - 24, h - 40, tw + 16, 30);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, w - tw - 16, h - 18);
}

export function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} сек назад`;
  if (s < 3600) return `${Math.round(s / 60)} мин назад`;
  if (s < 86400) return `${Math.round(s / 3600)} ч назад`;
  return `${Math.round(s / 86400)} дн назад`;
}
