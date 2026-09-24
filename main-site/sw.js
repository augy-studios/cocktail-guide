// Bump on every deploy that changes anything this worker serves. The browser
// only sees an update when this file's bytes change, and the update bar only
// appears when it does. See update-bar-spec.md.
const VERSION = "2026-09-24.1";

const CACHE = `cocktailguide-${VERSION}`;

// Runtime caches keep stable names so drinks looked up before a deploy are
// still there offline after it. Capped, because photos are cached opaque and
// browsers count each opaque entry at a padded size against the quota.
const API_CACHE = "cocktailguide-api";
const IMAGE_CACHE = "cocktailguide-images";
const FONT_CACHE = "cocktailguide-fonts";
const RUNTIME_LIMIT = 60;

const KEEP = [CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE];

// "/" and never "/index.html": with cleanUrls on, Vercel redirects the
// latter, and a cached redirect cannot be used to answer a navigation.
const ASSETS = [
  "/",
  "/style.css",
  "/script.js",
  "/js/theme.js",
  "/js/icons.js",
  "/js/ui.js",
  "/js/update.js",
  "/XCG-192.png",
  "/XCG-512.png",
  "/favicon.ico",
  "/manifest.json"
];

/* -- Install: cache shell, then wait -- */

// No skipWaiting() here. A new worker waits until somebody presses Reload
// in the update bar; see the message handler below.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
    // Bypass the HTTP cache so a new version never precaches old files.
    .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
  );
});

/* -- Activate: clean old caches -- */

// No clients.claim() here either: claiming on activation would do silently
// what the update bar exists to ask about.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
    .then(keys =>
      Promise.all(
        keys
        .filter(k => !KEEP.includes(k))
        .map(k => caches.delete(k))
      )
    )
  );
});

/* -- Message: the update bar's Reload -- */

self.addEventListener('message', (event) => {
  const type = typeof event.data === 'string' ? event.data : event.data?.type;

  // The only place either of these is ever called.
  if (type === 'skip-waiting') {
    event.waitUntil(self.skipWaiting().then(() => self.clients.claim()));
  }
});

/* -- Fetch: strategy per route -- */

self.addEventListener('fetch', event => {
  const { request } = event;

  // Only GETs can be cached. Everything else goes straight to the network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // Cocktail search proxy - network first, last answer when offline
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirst(request, API_CACHE));
      return;
    }

    // static assets - cache first
    event.respondWith(cacheFirst(request, CACHE));
    return;
  }

  // Google Fonts - cache first (immutable)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // Drink photos - cache first
  if (url.hostname.endsWith('thecocktaildb.com') && url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, RUNTIME_LIMIT));
    return;
  }

  // Anything else cross origin (analytics) is left to the browser.
});

/* -- Strategies -- */

// Opaque responses come from no-cors requests, which is how <img> and the
// Google Fonts <link> fetch. They cannot be inspected, but they can be replayed.
function isCacheable(response) {
  return response.ok || response.type === 'opaque';
}

async function put(cacheName, request, response, limit) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  if (!limit) return;

  // Keys come back oldest first, so drop from the front.
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(k => cache.delete(k)));
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) await put(cacheName, request, response.clone(), RUNTIME_LIMIT);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // script.js reads `offline` to tell this apart from a server error.
    return new Response(
      JSON.stringify({
        offline: true,
        error: 'You appear to be offline.'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        },
      }
    );
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheable(response)) await put(cacheName, request, response.clone(), limit);
    return response;
  } catch {
    // offline - fallback for navigation
    if (request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    return new Response('Offline', {
      status: 503
    });
  }
}
