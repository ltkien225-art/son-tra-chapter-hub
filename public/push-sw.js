/* Hội LHPN Sơn Trà — notification-only service worker.
 * No fetch handler, no caching: private records are never stored by this worker. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === "string" ? data.title : "Hội LHPN Sơn Trà";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "Có cập nhật mới. Mở ứng dụng để xem.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : "hoi",
      data: { url: typeof data.url === "string" && /^\/app(\?tab=[a-z]+)?$/.test(data.url) ? data.url : "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (new URL(c.url).origin === self.location.origin) { c.navigate(target); return c.focus(); }
      return self.clients.openWindow(target);
    }),
  );
});
