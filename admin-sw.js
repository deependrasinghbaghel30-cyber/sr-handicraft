/* SR Handicraft admin app — service worker (scope /admin).
   Always live: nothing is cached, so the client never sees stale products.
   Only job: let the phone install the admin as an app, and show a clear
   message instead of a browser error when there is no internet. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SR Admin — offline</title><body style="margin:0;font:16px/1.5 system-ui,sans-serif;background:#F7F3EE;color:#2A2019;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div><h2 style="color:#6B2D1C;margin:0 0 8px">No internet</h2><p style="margin:0 0 18px">Connect to Wi-Fi or mobile data, then try again.</p>
<button onclick="location.reload()" style="background:#6B2D1C;color:#fff;border:0;border-radius:10px;padding:12px 22px;font:inherit;font-weight:700">Try again</button></div>`;
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
