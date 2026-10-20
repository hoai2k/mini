// Keeps the app itself available offline. Network first, so a new version
// shows on the next visit; the cached copy is the fallback when there is no
// connection.
const CACHE = 'imageannotator-v4';
const SHELL = [
  './', 'index.html', 'styles.css', 'icon.svg', 'manifest.webmanifest', 'data/asset-list.json',
  'src/main.js', 'src/geometry.js', 'src/layout.js', 'src/render.js', 'src/exporter.js', 'src/store.js', 'src/icons.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'assets/ui/logo.webp', 'assets/ui/welcome.webp', 'assets/ui/cover.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('imageannotator-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
