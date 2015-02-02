'use strict';



var PrecacheConfig = [["src/404.html","0ee7f4808599a5785f68814a81f370b6"],["src/index.html","6951ff940ce67f5e6a006ef2ecc6294f"],["src/serviceworker-cache-polyfill.js","16c53b7e1c392676de06ff89fbb960e4"],["src/sw.js","4dcf39d39c79c3b9db610425990fbcf4"]];
var CacheNamePrefix = 'sw-precache-v1-protoServiceWorker-' + (self.registration ? self.registration.scope : '') + '-';
var AbsoluteUrlToCacheName;
var CurrentCacheNamesToAbsoluteUrl;
populateCurrentCacheNames(PrecacheConfig, CacheNamePrefix);



function getCacheNameFromCacheOption(cacheOption) {
  return CacheNamePrefix + cacheOption[0] + '-' + cacheOption[1];
}

function populateCurrentCacheNames(precacheConfig, cacheNamePrefix) {
  AbsoluteUrlToCacheName = {};
  CurrentCacheNamesToAbsoluteUrl = {};

  precacheConfig.forEach(function(cacheOption) {
    var absoluteUrl = new URL(cacheOption[0], self.location).toString();
    var cacheName = CacheNamePrefix + absoluteUrl + '-' + cacheOption[1];
    CurrentCacheNamesToAbsoluteUrl[cacheName] = absoluteUrl;
    AbsoluteUrlToCacheName[absoluteUrl] = cacheName;
  });
}

function deleteAllCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      })
    );
  });
}

self.addEventListener('install', function(event) {

console.log('install');
  
  event.waitUntil(
    caches.keys().then(function(allCacheNames) {
      return Promise.all(
        Object.keys(CurrentCacheNamesToAbsoluteUrl).filter(function(cacheName) {
          return allCacheNames.indexOf(cacheName) == -1;
        }).map(function(cacheName) {
          var url = CurrentCacheNamesToAbsoluteUrl[cacheName];
          console.log('Adding URL "%s" to cache named "%s"', url, cacheName);
          return caches.open(cacheName).then(function(cache) {
            return cache.add(new Request(url, {credentials: 'same-origin'}));
          });
        })
      ).then(function() {
        return Promise.all(
          allCacheNames.filter(function(cacheName) {
            return cacheName.indexOf(CacheNamePrefix) == 0 &&
                   !(cacheName in CurrentCacheNamesToAbsoluteUrl);
          }).map(function(cacheName) {
            console.log('Deleting out-of-date cache "%s"', cacheName);
            return caches.delete(cacheName);
          })
        )
      });
    }).then(function() {
      if (typeof self.skipWaiting == 'function') {
        // Force the SW to transition from installing -> active state
        self.skipWaiting();
      }
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data.command == 'delete_all') {
    console.log('About to delete all caches...');
    deleteAllCaches().then(function() {
      console.log('Caches deleted.');
      event.ports[0].postMessage({
        error: null
      });
    }).catch(function(error) {
      console.log('Caches not deleted:', error);
      event.ports[0].postMessage({
        error: error
      });
    });
  }
});




// From https://github.com/coonsta/cache-polyfill/blob/master/dist/serviceworker-cache-polyfill.js

if (!Cache.prototype.add) {
  Cache.prototype.add = function add(request) {
    return this.addAll([request]);
  };
}

if (!Cache.prototype.addAll) {
  Cache.prototype.addAll = function addAll(requests) {
    var cache = this;

    // Since DOMExceptions are not constructable:
    function NetworkError(message) {
      this.name = 'NetworkError';
      this.code = 19;
      this.message = message;
    }
    NetworkError.prototype = Object.create(Error.prototype);

    return Promise.resolve().then(function() {
      if (arguments.length < 1) throw new TypeError();

      // Simulate sequence<(Request or USVString)> binding:
      var sequence = [];

      requests = requests.map(function(request) {
        if (request instanceof Request) {
          return request;
        }
        else {
          return String(request); // may throw TypeError
        }
      });

      return Promise.all(
          requests.map(function(request) {
            if (typeof request === 'string') {
              request = new Request(request);
            }

            var scheme = new URL(request.url).protocol;

            if (scheme !== 'http:' && scheme !== 'https:') {
              throw new NetworkError("Invalid scheme");
            }

            return fetch(request.clone());
          })
      );
    }).then(function(responses) {
      // TODO: check that requests don't overwrite one another
      // (don't think this is possible to polyfill due to opaque responses)
      return Promise.all(
          responses.map(function(response, i) {
            return cache.put(requests[i], response);
          })
      );
    }).then(function() {
      return undefined;
    });
  };
}

if (!CacheStorage.prototype.match) {
  // This is probably vulnerable to race conditions (removing caches etc)
  CacheStorage.prototype.match = function match(request, opts) {
    var caches = this;

    return this.keys().then(function(cacheNames) {
      var match;

      return cacheNames.reduce(function(chain, cacheName) {
        return chain.then(function() {
          return match || caches.open(cacheName).then(function(cache) {
                return cache.match(request, opts);
              }).then(function(response) {
                match = response;
                return match;
              });
        });
      }, Promise.resolve());
    });
  };
}

