"use strict";

const APP_ORIGIN = self.location.origin;
const DEFAULT_PRAYER_URL = `${APP_ORIGIN}/#office-morning_prayer`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || message.type !== "SHOW_PRAYER_NOTIFICATION") {
    return;
  }

  const url = getSafePrayerUrl(message.url);
  const title =
    typeof message.title === "string" && message.title.trim()
      ? message.title
      : "Time for the Liturgy of the Hours";
  const body =
    typeof message.body === "string" && message.body.trim()
      ? message.body
      : "Pause and open the appointed hour.";
  const tag =
    typeof message.tag === "string" && message.tag.trim()
      ? message.tag
      : "sanctum-council-prayer";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [180, 90, 180, 90, 360],
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = getSafePrayerUrl(event.notification.data?.url);

  event.waitUntil(focusOrOpenPrayer(targetUrl));
});

function getSafePrayerUrl(value) {
  try {
    const url = new URL(
      typeof value === "string" ? value : DEFAULT_PRAYER_URL,
      APP_ORIGIN,
    );

    if (url.origin !== APP_ORIGIN || !url.hash.startsWith("#office-")) {
      return DEFAULT_PRAYER_URL;
    }

    return url.href;
  } catch {
    return DEFAULT_PRAYER_URL;
  }
}

async function focusOrOpenPrayer(targetUrl) {
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const exactWindow = windows.find((client) => client.url === targetUrl);
  if (exactWindow) {
    return exactWindow.focus();
  }

  const appWindow = windows.find(
    (client) => new URL(client.url).origin === APP_ORIGIN,
  );
  if (appWindow) {
    const navigatedWindow = await appWindow.navigate(targetUrl);
    return (navigatedWindow ?? appWindow).focus();
  }

  return self.clients.openWindow(targetUrl);
}
