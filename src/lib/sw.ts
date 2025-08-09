// Ignore typescript errors in this file
// @ts-nocheck
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open("app-cache-v1").then((cache) => {
			return cache.addAll([
				"/",
				"/index.html",
				"/logo-192.png",
				"/logo-512.png",
				"/manifest.webmanifest",
			]);
		}),
	);
});

self.addEventListener("fetch", (event) => {
	event.respondWith(
		caches.match(event.request).then((resp) => {
			return resp || fetch(event.request);
		}),
	);
});
