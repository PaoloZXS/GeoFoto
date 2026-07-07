self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
    Promise.all([clients.claim(), caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))])
));
