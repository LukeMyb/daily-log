self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // APIリクエストやPOST等はキャッシュせず常にネットワークへ中継
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }
});
