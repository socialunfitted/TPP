// ============================================================
// SERVICE WORKER — Offline PWA Support
// Thanjai Paruthi Paal POS
// ============================================================

const CACHE_NAME = 'tpp-pos-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/qrcode.min.js',
  './js/db.js',
  './js/utils.js',
  './js/whatsapp.js',
  './js/pdf.js',
  './js/backup.js',
  './js/app.js',
  './js/pages/dashboard.js',
  './js/pages/billing.js',
  './js/pages/sales.js',
  './js/pages/customers.js',
  './js/pages/products.js',
  './js/pages/reports.js',
  './js/pages/expenses.js',
  './js/pages/settings.js',
  './assets/logo.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-first for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin.split('//')[1].split(':')[0])) return;

  // CDN requests: network-first
  if (url.hostname.includes('cdnjs') || url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
