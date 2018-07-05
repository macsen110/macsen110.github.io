'use strict';

const version = 'v9000';
const __DEVELOPMENT__ = true;
const __DEBUG__ = true;
const offlineResources = [
  '/',
  '/offline.html',
  '/offline.svg'
];


const ignoreFetch = [
  /https?:\/\/cdn.bootcss.com\//,
  /https?:\/\/static.duoshuo.com\//,
  /https?:\/\/www.google-analytics.com\//,
  /https?:\/\/dn-lbstatics.qbox.me\//,
  /https?:\/\/s.maiyaole.com\//,
  /https?:\/\/www.macsen318.com\//,
];



//////////
// Install
//////////
function onInstall(event) {
  updateStaticCache()
  event.waitUntil(self.skipWaiting());
  //log('install event in progress.');
  //event.waitUntil(updateStaticCache());
}



function updateStaticCache() {
  return caches
    .open(cacheKey('offline'))
    .then((cache) => {
      return cache.addAll(offlineResources);
    })
    .then(() => {
      log('installation complete!');
    });
}




////////
// Fetch
////////
function onFetch(event) {
  const request = event.request;
  if (request.method === 'POST') return;
  if (shouldAlwaysFetch(request)) {
    console.log('shouldAlwaysFetch: ', request.url)
    event.respondWith(networkedOrOffline(request));
    return;
  }
  if (shouldFetchAndCache(request)) {
    console.log('shouldFetchAndCache: ', request.url)
    event.respondWith(networkedOrCached(request));
    return;
  }
  console.log('cachedOrNetworked: ', request.url)
  event.respondWith(cachedOrNetworked(request));
}

function networkedOrCached(request) {
  return networkedAndCache(request)
    .catch(() => { return cachedOrOffline(request) });
}

// Stash response in cache as side-effect of network request
function networkedAndCache(request) {
  return fetch(request)
    .then((response) => {
      var copy = response.clone();
      caches.open(cacheKey('resources'))
        .then((cache) => {
          cache.put(request, copy);
        });

      log("(network: cache write)", request.method, request.url);
      return response;
    });
}

function cachedOrNetworked(request) {
  return caches.match(request)
    .then((response) => {
      log(response ? '(cached555)' : '(network: cache miss999)', request.method, request.url);
      return response ||
        networkedAndCache(request)
          .catch(() => { return offlineResponse(request) });
    });
}

function networkedOrOffline(request) {
  return fetch(request)
    .then((response) => {
      console.log('(network)', request.method, request.url);
      return response;
    })
    .catch(() => {
      return offlineResponse(request);
    });
}



function cachedOrOffline(request) {
  return caches
    .match(request)
    .then((response) => {
      return response || offlineResponse(request);
    });
}

function offlineResponse(request) {
  log('(offline)', request.method, request.url);
  if (request.url.match(/\.(jpg|png|gif|svg|jpeg)(\?.*)?$/)) {
    return caches.match('/offline.svg');
  } else {
    return caches.match('/offline.html');
  }
}

///////////
// Activate
///////////
function onActivate(event) {
  
  event.waitUntil(removeOldCache());
}

function removeOldCache() {
  self.clients.claim()
  return caches
    .keys()
    .then((keys) => {
      return Promise.all( // We return a promise that settles when all outdated caches are deleted.
        keys
         .filter((key) => {
           return !key.startsWith(version); // Filter by keys that don't start with the latest version prefix.
         })
         .map((key) => {
           return caches.delete(key); // Return a promise that's fulfilled when each outdated cache is deleted.
         })
      );
    })
    .then(() => {
      log('removeOldCache completed.');
    });
}

function cacheKey() {
  return [version, ...arguments].join(':');
}

function log() {
  console.log("SW:", ...arguments);
  // if (developmentMode()) {
    
  // }
}

function shouldAlwaysFetch(request) {
  return request.method !== 'POST' &&
      ignoreFetch.some(regex => request.url.match(regex));
}

function shouldFetchAndCache(request) {
  let isNeedCache = ~request.headers.get('Accept').indexOf('text/html');
  console.log('request: ', request.url, ' ', isNeedCache)
  return isNeedCache
}

function developmentMode() {
  return __DEVELOPMENT__ || __DEBUG__;
}

log("Hello from ServiceWorker land!", version);

self.addEventListener('install', onInstall);

self.addEventListener('fetch', onFetch);

self.addEventListener("activate", onActivate);
