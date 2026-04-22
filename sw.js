const CACHE = 'ikigai-v2.0';
const FILES = ['/ikigai/', '/ikigai/index.html', '/ikigai/manifest.json', '/ikigai/icon-192.png', '/ikigai/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // Laisser passer tout ce qui n'est pas notre site
  if (!e.request.url.includes('ikigai482.github.io')) return;
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r?.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => caches.match('/ikigai/index.html'));
    })
  );
});
