const CACHE = 'geofoto-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(
    Promise.all([clients.claim(), caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))])
));

self.addEventListener('fetch', e => {
    // Solo risorse statiche (no API)
    if (e.request.url.includes('/api/')) return;

    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
