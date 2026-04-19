// ===== IKIGAI — Service Worker PWA =====
const CACHE_NAME = 'ikigai-v1.8';
const OFFLINE_URL = '/ikigai/index.html';

// Fichiers à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/ikigai/',
  '/ikigai/index.html',
  '/ikigai/manifest.json',
  '/ikigai/icon-192.png',
  '/ikigai/icon-512.png',
];

// ===== INSTALLATION =====
self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des fichiers essentiels');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATION =====
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== INTERCEPTION DES REQUÊTES =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Laisser passer les requêtes API externes (météo, Firebase, Cloudflare Worker)
  const externalAPIs = [
    'api.anthropic.com',
    'api.open-meteo.com',
    'nominatim.openstreetmap.org',
    'workers.dev',
    'firebaseio.com',
    'googleapis.com',
    'gstatic.com',
    'currentsapi.services',
    'www.alphavantage.co',
    'cdnjs.cloudflare.com',
    'd3js.org',
    'unpkg.com',
  ];

  if (externalAPIs.some(api => url.hostname.includes(api))) {
    // Requête réseau directe pour les APIs
    event.respondWith(fetch(event.request));
    return;
  }

  // Stratégie Cache First pour les fichiers locaux
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Mis en cache → répondre immédiatement
        // Mettre à jour en arrière-plan (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Pas en cache → réseau
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // Mettre en cache pour la prochaine fois
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Hors ligne → page offline
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ===== NOTIFICATIONS PUSH (optionnel) =====
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Tu as une notification Ikigai',
    icon: '/ikigai/icon-192.png',
    badge: '/ikigai/icon-192.png',
    tag: data.tag || 'ikigai',
    data: { url: data.url || '/ikigai/' },
    actions: [
      { action: 'open', title: 'Ouvrir Ikigai' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Ikigai ✦', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/ikigai/')
  );
});

console.log('[SW] Ikigai Service Worker chargé ✦');
