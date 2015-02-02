'use strict';

importScripts('serviceworker-cache-polyfill.js');

var CACHE_NAME = 'my-site-cache-v1';

// The files we want to cache
var urlsToCache = [
    '/index.html',
    '/assets/images/gulp.png'
];

// Set the callback for the install step
self.addEventListener('install', function(event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(function(cache) {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
        .then(function(response) {
            // Cache hit - return response
            if (response) {
            	console.log('Cache hit');
                return response;
            }

			console.log('Get from network');
            return fetch(event.request);
        })
    );
});
