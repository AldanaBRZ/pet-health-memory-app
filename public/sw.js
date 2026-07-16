const CACHE_VERSION = "v4";
const CACHE_PREFIX = "pet-health-memory";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const APP_SHELL = ["/offline", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

function isCacheableResponse(response) {
  if (!response || !response.ok || (response.type !== "basic" && response.type !== "default")) return false;
  const cacheControl = response.headers.get("cache-control") ?? "";
  return !/no-store|private/i.test(cacheControl);
}

function staticAssetPaths(html) {
  const matches = html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g);
  return [...new Set(Array.from(matches, (match) => new URL(match[1], self.location.origin).pathname))];
}

async function cacheAppShell() {
  const shellCache = await caches.open(SHELL_CACHE);
  const rootResponse = await fetch(new Request("/", { cache: "reload" }));
  if (!rootResponse.ok) throw new Error("Could not fetch the application shell.");

  const rootHtml = await rootResponse.clone().text();
  await shellCache.put("/", rootResponse);
  await Promise.allSettled(APP_SHELL.map((path) => shellCache.add(new Request(path, { cache: "reload" }))));

  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(
    staticAssetPaths(rootHtml).map((path) => staticCache.add(new Request(path, { cache: "reload" })))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(`${CACHE_PREFIX}-`) && key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const fallbackPath = new URL(request.url).pathname === "/" ? "/" : "/offline";
    return (await caches.match(fallbackPath)) ?? (await caches.match("/offline")) ?? Response.error();
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstShellAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/") || request.headers.has("authorization")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirstShellAsset(request));
  }
});
