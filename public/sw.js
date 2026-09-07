const CACHE_VERSION = "2026-08-27-v5";
const CACHE_PREFIX = "talleros-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;

const OPTIONAL_SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand/circuit-pattern-light.svg",
  "/brand/circuit-pattern-dark.svg",
];

function canCache(response) {
  if (!response || !response.ok || response.type !== "basic") {
    return false;
  }

  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !/(?:no-store|private)/i.test(cacheControl);
}

async function cacheOptionalAsset(cache, url) {
  try {
    const request = new Request(url, { cache: "reload" });
    const response = await fetch(request);

    if (canCache(response)) {
      await cache.put(request, response);
    }
  } catch {
    // A non-critical asset must not prevent the worker from installing.
  }
}

function discoverExecutableShell(html) {
  const assets = new Set();
  const attributePattern = /(?:src|href)=["']([^"'#]+)["']/gi;
  let match;

  while ((match = attributePattern.exec(html))) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin !== self.location.origin) continue;
      if (/\.(?:css|js|mjs|woff2?|png|svg|webp)$/i.test(url.pathname) || url.pathname.startsWith("/_next/") || url.pathname.startsWith("/assets/")) {
        assets.add(`${url.pathname}${url.search}`);
      }
    } catch {
      // Ignore malformed or unsupported resource references.
    }
  }

  return [...assets];
}

async function cacheRequiredAsset(cache, url) {
  const request = new Request(url, { cache: "reload" });
  const response = await fetch(request);
  if (!canCache(response)) throw new Error(`Required offline asset failed: ${url}`);
  await cache.put(request, response.clone());
  return response;
}

async function cacheExecutableShell(cache) {
  const documentResponse = await cacheRequiredAsset(cache, "/");
  const html = await documentResponse.text();
  const executableAssets = discoverExecutableShell(html);
  if (!executableAssets.length) throw new Error("No executable shell assets were discovered.");
  await Promise.all(executableAssets.map((url) => cacheRequiredAsset(cache, url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cacheExecutableShell(cache);
      await Promise.all(OPTIONAL_SHELL_ASSETS.map((url) => cacheOptionalAsset(cache, url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) &&
              name !== SHELL_CACHE &&
              name !== STATIC_CACHE,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);

    if (canCache(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedPage = await cache.match(request, { ignoreSearch: true });
    const cachedShell = await cache.match("/");

    if (cachedPage || cachedShell) {
      return cachedPage ?? cachedShell;
    }

    return new Response(
      "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Sin conexión · TallerOS</title><body><main><h1>Estás sin conexión</h1><p>TallerOS volverá a cargar cuando recuperes internet.</p></main></body></html>",
      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const shellCache = await caches.open(SHELL_CACHE);
  const cached = (await cache.match(request)) ?? (await shellCache.match(request));

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (canCache(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|mjs|svg|png|jpe?g|webp|avif|ico|woff2?)$/i.test(
      url.pathname,
    )
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || request.headers.has("range")) {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
