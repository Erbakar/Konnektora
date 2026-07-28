self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(payload.title || "Konnektora", {
    body: payload.body || "Yeni bir bildirimin var.",
    icon: "/brand/konnektora-mark.svg",
    badge: "/brand/konnektora-mark.svg",
    data: { url: payload.url || "/account" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const target = new URL(event.notification.data?.url || "/account", self.location.origin).href;
    const existing = windows.find((windowClient) => windowClient.url === target);
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
