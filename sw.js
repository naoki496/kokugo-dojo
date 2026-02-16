const CACHE_NAME = "hatto-top-v2.1"; // ※更新したらここを上げる
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./header.png",
  "./kobun.png",
  "./jodou.png",
  "./bunn.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ページ遷移はネット優先、ダメならindex.html
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  // 静的資産はキャッシュ優先（プリキャッシュ対象のみ）
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
