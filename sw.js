
const CACHE_NAME = "goalhub-pro-v3";

const BASE_PATH = "/GOALHUB-";

const APP_FILES = [
  BASE_PATH + "/",
  BASE_PATH + "/index.html",
  BASE_PATH + "/manifest.json",
  BASE_PATH + "/icon-192.png",
  BASE_PATH + "/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  /*
   * API-Football is LIVE data.
   * Never serve API requests from the PWA cache.
   */
  if (
    url.hostname.includes("api-football.com") ||
    url.hostname.includes("api-sports.io")
  ) {
    event.respondWith(
      fetch(event.request)
    );
    return;
  }

  event.respondWith(

    fetch(event.request)

      .then(response => {

        if (
          response &&
          response.status === 200 &&
          response.type !== "opaque"
        ) {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, copy);
            });

        }

        return response;

      })

      .catch(() => {

        return caches.match(event.request)
          .then(cached => {

            if (cached) {
              return cached;
            }

            return caches.match(
              BASE_PATH + "/index.html"
            );

          });

      })

  );

});
