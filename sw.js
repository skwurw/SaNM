var CACHE_NAME = 'SANM-CACHE';
var urlsToCache = [
	'/',
];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
		// console.log('Opened cache');
		return cache.addAll(urlsToCache);
	}));
});

self.addEventListener('fetch', (event) => {
	// console.log('fetch event caught');
	event.respondWith(caches.match(event.request).then((response) => {
		// Cache hit -- return response
		if (response) {
			// return response;
		}
		return fetch(event.request);
	}));
});