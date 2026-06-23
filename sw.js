// ============================================================================
// sw.js — Service worker de la PWA Ayroma
// Habilita: (1) que la app se pueda INSTALAR y (2) que la "cáscara" abra sin
// internet (offline básico). Los DATOS en vivo igual necesitan red (Firebase).
// ============================================================================

// Nombre/versión de la caché. Si cambiás archivos, subí el número (v1 → v2) para refrescar.
const CACHE = 'ayroma-v1';

// Archivos de la "cáscara" de la app que guardamos para que abra offline
const ASSETS = [
  './',
  './index.html',
  './style.css?v=4',
  './config.js',
  './auth.js?v=2',
  './inventory.js',
  './scanner.js?v=4',
  './cart.js?v=1',
  './app.js?v=2',
  './manifest.json',
  './img/portada.jpg',
  './img/icon-192.png',
  './img/icon-512.png'
];

// Al INSTALARSE el service worker: guarda la cáscara en la caché
self.addEventListener('install', (e) => {
  // allSettled: si algún archivo fallara, no rompe toda la instalación
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())   // activa la versión nueva enseguida
  );
});

// Al ACTIVARSE: borra cachés viejas de versiones anteriores
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// En cada pedido: RED PRIMERO (para que siempre veas lo último cuando hay internet),
// y si no hay internet, servimos lo guardado en caché.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Solo manejamos pedidos GET del PROPIO sitio. Firebase y las CDN van directo a la red.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        // Guardamos una copia fresca en la caché para el modo offline
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
