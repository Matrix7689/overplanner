// Service worker for the capture app. It keeps the app opening with the PC off,
// and sends the queue in the background when Android says the network is back.
"use strict";

importScripts("./queue.js");

const CACHE = "capture-v1";
const SHELL = ["./", "./app.js", "./queue.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Open instantly from the cache, then refresh the cache quietly for next time.
// Waiting on the network first could hang for a long time when the PC is off.
// The API is never touched here.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  if (!url.pathname.startsWith("/capture/")) return;

  // Shared items arrive as /capture/?text=...; they all use the same page.
  const key = event.request.mode === "navigate" ? "./" : event.request;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const refresh = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => undefined);
      if (cached) {
        event.waitUntil(refresh);
        return cached;
      }
      return (await refresh) ?? Response.error();
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "send-queue") return;
  event.waitUntil(
    OverplannerQueue.flush().then(async (result) => {
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "queue-changed", reachable: result.reachable }));
      // Rejecting makes Android try again later.
      if (!result.reachable) throw new Error("PC not reachable");
    }),
  );
});
