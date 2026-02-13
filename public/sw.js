// Service Worker for PWA - Offline support and caching
const CACHE_NAME = 'retail-pos-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Opened cache');
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('⚠️ Some resources failed to cache:', err);
          // Don't fail the install if some resources fail
        });
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim(); // Take control immediately
    })
  );
});