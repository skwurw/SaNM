var CACHE_NAME = 'SANM-CACHE';
var urlsToCache = [
	// '/SaNM/',
	'./resources/jquery-3.2.1.min.js',
	'./resources/bootbox.min.js',
	'./resources/bootstrap.min.js',
	'./resources/bootstrap.min.css',
	
	'./resources/bg_glitch_pattern.png',
	'./resources/connect.png',
	'./resources/favicon.png',

	/*'./resources/main.css',

	'./resources/app.js',
	'./resources/main.js',
	'./resources/Stream.js',*/
];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
		// console.log('Opened cache');
		return cache.addAll(urlsToCache);
	}));
});

self.addEventListener('fetch', (event) => {
	event.respondWith(caches.match(event.request).then((response) => {
		// Cache hit -- return response
		
		if (response) {
			return response;
		}
		// |jtv_user_pictures
		// caches.open('LIVEPREVIEW-CACHE').then(cache => {
			var JTVImg = event.request.url.match(/(?:static-cdn\.jtvnw\.net\/(previews-ttv)\/.*)/i);

			if (JTVImg) {
				var imgType = JTVImg[1];

				if (/*imgType == 'jtv_user_picures' || */imgType == 'previews-ttv') {
					return fetch(event.request.url).then(liveResponse => {
						// liveResponse.headers.forEach(key => console.log(key));
						// console.log(event.request,liveResponse);

						return liveResponse;
					});
				}
			} else {
				return fetch(event.request);
			}
		// });
		// return fetch(event.request.url).then(liveResponse => {
		// 	var returnedRes = liveResponse.clone();

		// 	liveResponse.blob().then(body => {
		// 		console.log(liveResponse,body);

		// 		return returnedRes;
		// 	});
		// });
	}));
});