// PWA Service Worker for AI.JOBS
// Enables install prompt on Chrome (beforeinstallprompt requires a functional SW)

const CACHE_NAME = "aijobs-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  // Pre-cache the homepage for offline fallback
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL).catch(() => {
        // Non-blocking: if homepage pre-cache fails, SW still activates
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only handle navigation requests for offline fallback
  // Pass through all other requests (API, static assets handled by CDN)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL) || new Response("Offline", { status: 503 });
      })
    );
  }
});
