/* Offline support for the hub (keepers often stand in corners of the building with weak signal).
   - Pages: network first, so a new deploy shows at once; the last copy is used when offline.
   - Scripts, styles, photos, models, fonts, three.js: served from the cache straight away and refreshed in the
     background (stale-while-revalidate). Asset URLs carry ?v=…, so a deploy fetches new files anyway.
   - The team's sheet and the submission script are never cached here: data.js keeps its own copy of the sheet,
     and a submission must reach the script or fail loudly. */
const CACHE = "akc-v2";
const SHELL = ["./", "index.html", "m.html", "cats.html"];
const SKIP = /(^|\.)(docs|script|sheets)\.google(usercontent)?\.com$/;
const CDN = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function put(req, res) {
  if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (SKIP.test(url.hostname)) return;
  const same = url.origin === self.location.origin;
  if (!same && !CDN.test(url.hostname)) return;
  // clips stream straight from the network: browsers ask for byte ranges, which a cached copy can't answer
  if (req.headers.has("range") || /\.(mp4|m4v|mov|webm)$/i.test(url.pathname)) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() =>
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(url.pathname.endsWith("index.html") || url.pathname.endsWith("/") ? "index.html" : "cats.html"))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => put(req, res)).catch(() => hit);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
