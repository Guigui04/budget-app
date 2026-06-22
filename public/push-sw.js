/* Web Push handlers, imported into the generated service worker. */
self.addEventListener('push', (event) => {
  let data = { title: 'Foyer', body: '' }
  try {
    data = event.data.json()
  } catch (_) {
    data.body = event.data ? event.data.text() : ''
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Foyer', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'foyer-alert',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const target = list.find((c) => 'focus' in c)
      return target ? target.focus() : self.clients.openWindow('/alertes')
    }),
  )
})
