const CACHE = 'ikigai-v1.9';
const FILES = ['/ikigai/', '/ikigai/index.html', '/ikigai/manifest.json', '/ikigai/icon-192.png', '/ikigai/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Laisser passer TOUT ce qui n'est pas le site lui-même
  // Firebase, Google, CDN, APIs — tout passe directement
  if (url.hostname !== 'ikigai482.github.io') {
    return; // Pas d'interception — requête normale
  }

  // Pour les fichiers du site uniquement : cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        fetch(e.request).then(r => {
          if (r?.ok) caches.open(CACHE).then(c => c.put(e.request, r));
        }).catch(()=>{});
        return cached;
      }
      return fetch(e.request).then(r => {
        if (r?.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => caches.match('/ikigai/index.html'));
    })
  );
});
