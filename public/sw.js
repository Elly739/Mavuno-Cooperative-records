const CACHE_NAME = 'mavuno-shell-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/mavuno.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  const refresh = fetch(request).then((response) => {
    if (!response.ok) return response
    return caches.open(CACHE_NAME)
      .then((cache) => cache.put(request, response.clone()))
      .catch((error) => console.error('Could not cache an app resource.', error))
      .then(() => response)
  })

  event.waitUntil(refresh.then(() => undefined, () => undefined))
  event.respondWith(
    caches.match(request)
      .then((cached) => cached || refresh)
      .catch(() => refresh)
      .catch(async () => {
        if (request.mode === 'navigate') {
          const shell = await caches.match('/')
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
