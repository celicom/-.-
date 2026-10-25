// Портреты мастеров лежат в public/avatars (внешние CDN не используются: 152-ФЗ и независимость от иностранных сервисов).
// rafael.jpg — реальная фотография мастера с сайта remontkm.ru.
// ВНИМАНИЕ: фото Алексея, Елены и Даниила — стоковые портреты для демо. Перед запуском замените их
// реальными фотографиями мастеров (файлы alexey.jpg, elena.jpg, daniil.jpg): иначе это вводит клиентов в заблуждение.
const PHOTOS: Record<string, string> = {
  rafael: "/avatars/rafael.jpg",
  alexey: "/avatars/alexey.jpg",
  elena: "/avatars/elena.jpg",
  daniil: "/avatars/daniil.jpg",
};

export function masterPhoto(id: string, _size = 160) {
  return PHOTOS[id] ?? null;
}
