"use client";

// Одно соединение SSE на вкладку: все компоненты подписываются на него.
// Иначе три открытых окна с несколькими хуками исчерпали бы лимит соединений браузера (6 на домен).

let es: EventSource | null = null;
let open = false;
const versionSubs = new Set<() => void>();
const statusSubs = new Set<(connected: boolean) => void>();

function ensure() {
  if (es || typeof window === "undefined") return;
  es = new EventSource("/api/stream");
  es.addEventListener("version", () => versionSubs.forEach((cb) => cb()));
  es.onopen = () => {
    open = true;
    statusSubs.forEach((cb) => cb(true));
  };
  es.onerror = () => {
    open = false;
    statusSubs.forEach((cb) => cb(false));
  };
}

function release() {
  if (versionSubs.size || statusSubs.size) return;
  es?.close();
  es = null;
  open = false;
}

/** Вызывает cb при каждом изменении данных в базе. */
export function subscribeVersion(cb: () => void) {
  versionSubs.add(cb);
  ensure();
  return () => {
    versionSubs.delete(cb);
    release();
  };
}

export function subscribeStatus(cb: (connected: boolean) => void) {
  statusSubs.add(cb);
  ensure();
  cb(open);
  return () => {
    statusSubs.delete(cb);
    release();
  };
}
