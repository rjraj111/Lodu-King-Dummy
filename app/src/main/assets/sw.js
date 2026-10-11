/**
 * Ludo King PWA Service Worker
 * Offline-First with Network-First fallback & background cache updating.
 */

const CACHE_NAME = 'ludo-king-pwa-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './controller.html',
  './style.css',
  './manifest.json',
  // Scripts
  './js/audio.js',
  './js/board.js',
  './js/diceEngine.js',
  './js/engine.js',
  './js/lobby.js',
  './js/sync.js',
  // Audio
  './assets/audio/click.mp3',
  './assets/audio/congratulations.mp3',
  './assets/audio/death.mp3',
  './assets/audio/diceroll.mp3',
  './assets/audio/gamestartsound.mp3',
  './assets/audio/music.mp3',
  './assets/audio/panta.mp3',
  './assets/audio/safe.mp3',
  './assets/audio/step.mp3',
  // Fonts
  './assets/fonts/fontbold.ttf',
  './assets/fonts/fontnormal.ttf',
  './assets/fonts/rcbold.ttf',
  './assets/fonts/rclight.ttf',
  './assets/fonts/rcnormal.ttf',
  // Images
  './assets/images/arrow_dice_hint.png',
  './assets/images/arrow_dice_hint_right.png',
  './assets/images/backgroundmaze.jpeg',
  './assets/images/bluepiece.png',
  './assets/images/bluepiecestylish.png',
  './assets/images/choosetokenbg.png',
  './assets/images/classicselectedtab.png',
  './assets/images/classicunselectedtab.png',
  './assets/images/coinbg.jpg',
  './assets/images/coins.png',
  './assets/images/computer.png',
  './assets/images/congratsscreentoplogo.png',
  './assets/images/diamond.png',
  './assets/images/dice0001.png',
  './assets/images/dice0002.png',
  './assets/images/dice0003.png',
  './assets/images/dice0004.png',
  './assets/images/dice0005.png',
  './assets/images/dice0006.png',
  './assets/images/dice0007.png',
  './assets/images/dice0008.png',
  './assets/images/dice1.png',
  './assets/images/dice2.png',
  './assets/images/dice3.png',
  './assets/images/dice4.png',
  './assets/images/dice5.png',
  './assets/images/dice6.png',
  './assets/images/dice_pad_left.png',
  './assets/images/dice_pad_right.png',
  './assets/images/greenpiece.png',
  './assets/images/greenpiecestylish.png',
  './assets/images/homebg.jpg',
  './assets/images/ingamemenubg.png',
  './assets/images/ingamemenubtn.png',
  './assets/images/ingamequitdialog.png',
  './assets/images/listwinner1crown.png',
  './assets/images/ludoboardfinal.png',
  './assets/images/ludofinalboard2.png',
  './assets/images/ludofinalboard3.png',
  './assets/images/musicoff.png',
  './assets/images/musicon.png',
  './assets/images/p1.png',
  './assets/images/p10.png',
  './assets/images/p2.png',
  './assets/images/p3.png',
  './assets/images/p4.png',
  './assets/images/p5.png',
  './assets/images/p6.png',
  './assets/images/p7.png',
  './assets/images/p8.png',
  './assets/images/p9.png',
  './assets/images/passnplay.png',
  './assets/images/passnplaytoplogo.png',
  './assets/images/playonline2.png',
  './assets/images/playwithfriends.png',
  './assets/images/quickselectedtab.png',
  './assets/images/quickunselectedtab.png',
  './assets/images/redpiece.png',
  './assets/images/redpiecestylish.png',
  './assets/images/selectblank.png',
  './assets/images/selectfill.png',
  './assets/images/selectgamebg.png',
  './assets/images/selectgamebg2.png',
  './assets/images/settings.png',
  './assets/images/soundoff.png',
  './assets/images/soundon.png',
  './assets/images/topheader.png',
  './assets/images/winnercrown.png',
  './assets/images/yellowpiece.png',
  './assets/images/yellowpiecestylish.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png'
];

// Install: Cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching core game assets');
      // Resilient caching: cache each asset individually so failure of one does not break all
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[ServiceWorker] Could not cache: ${url}`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`[ServiceWorker] Removing old cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First, falling back to Cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // For external resources (CDNs, Google Fonts, MQTT library), use Stale-While-Revalidate
  const isExternal = url.origin !== self.location.origin;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If valid response, update cache in background
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed -> Serve from Cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // For navigation requests, fallback to index.html
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('./index.html') || await caches.match('./');
          if (fallback) return fallback;
        }

        return new Response('Network error and no offline cache available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
