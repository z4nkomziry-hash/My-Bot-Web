// KrdDown - Advanced Service Worker
const CACHE_NAME = 'krddown-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/lang.js',
    '/manifest.json',
    '/icon.png',
    '/profile.jpg'
];

// Install Event - Cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch Event - Network first, then cache
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('tikwm.com') &&
        !event.request.url.includes('cobalt.tools')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful GET requests
                if (event.request.method === 'GET' && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if offline
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return the index.html for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline - No Connection', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Update from KrdDown! 🚀',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        data: {
            url: self.location.origin
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('KrdDown', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
