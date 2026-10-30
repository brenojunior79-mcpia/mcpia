import { createClient } from '@/lib/supabase-browser'
import { VAPID_PUBLIC_KEY } from '@/lib/push-config'

// Ativa as notificacoes do aparelho (usado pelo botao do ranking). Nunca lanca erro.
function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function detectPlatform(): string {
  try {
    const ua = navigator.userAgent || ''
    if (/android/i.test(ua)) return 'android'
    if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1)) return 'ios'
    return 'computador'
  } catch (e) { return 'outro' }
}

// Situacao do aparelho: 'ios_instalar' (iPhone fora do app), 'sem_suporte', 'bloqueado', 'pode_ativar' ou 'ativo_neste_aparelho'
export function situacaoNotificacao(): 'ios_instalar' | 'sem_suporte' | 'bloqueado' | 'pode_ativar' | 'ativo_neste_aparelho' {
  try {
    const temPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!temPush) return detectPlatform() === 'ios' ? 'ios_instalar' : 'sem_suporte'
    if (Notification.permission === 'denied') return 'bloqueado'
    if (Notification.permission === 'granted') return 'ativo_neste_aparelho'
    return 'pode_ativar'
  } catch (e) { return 'sem_suporte' }
}

export async function ativarNotificacoes(): Promise<'ok' | 'negado' | 'sem_suporte' | 'erro'> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem_suporte'
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (perm !== 'granted') return 'negado'
    await navigator.serviceWorker.register('/sw.js')
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any })
    const json: any = sub.toJSON()
    if (!json || !json.endpoint || !json.keys) return 'erro'
    const r = await createClient().rpc('save_push_subscription', {
      p_endpoint: json.endpoint, p_p256dh: json.keys.p256dh, p_auth: json.keys.auth,
      p_platform: detectPlatform(), p_user_agent: navigator.userAgent || '',
    })
    return r.error ? 'erro' : 'ok'
  } catch (e) { return 'erro' }
}
