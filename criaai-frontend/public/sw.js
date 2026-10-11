// Service worker da Plataforma do Cristao Prospero: recebe as notificacoes push.
self.addEventListener('install', function () { self.skipWaiting() })
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()) })

self.addEventListener('push', function (event) {
  var data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'Cristão Próspero', body: event.data ? event.data.text() : '' }
  }
  var title = data.title || 'Cristão Próspero'
  var options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/dashboard' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var raw = (event.notification.data && event.notification.data.url) || '/dashboard'
  var target
  try {
    var u = new URL(raw, self.location.origin)
    target = u.origin === self.location.origin ? u.href : self.location.origin + '/dashboard'
  } catch (e) {
    target = self.location.origin + '/dashboard'
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i]
        if ('focus' in c) {
          try { if ('navigate' in c) c.navigate(target) } catch (e) {}
          return c.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
