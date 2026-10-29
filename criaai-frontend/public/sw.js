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
    data: { url: data.url || '/dashboard', tipo: data.tipo || '', ref: data.ref || '' },
  }
  event.waitUntil(Promise.all([self.registration.showNotification(title, options), registrar('recebida', options.data)]))
})

// Conta (para o relatorio do admin) quando a notificacao chega e quando a pessoa clica. So para avisos com 'tipo'.
function registrar(evento, d) {
  if (!d || !d.tipo) return Promise.resolve()
  return self.registration.pushManager.getSubscription().then(function (sub) {
    if (!sub) return
    return fetch('/api/push/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: evento, tipo: d.tipo, ref: d.ref || null, endpoint: sub.endpoint }),
      keepalive: true,
    })
  }).catch(function () {})
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(registrar('clique', event.notification.data))
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
