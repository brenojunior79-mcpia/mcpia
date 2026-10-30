'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { VAPID_PUBLIC_KEY } from '@/lib/push-config'

// Registra o service worker, pede (de forma educada) para o aluno ativar as notificacoes
// e guarda o aparelho dele no banco. Qualquer erro e ignorado para nunca atrapalhar o aluno.
// O aviso aparece em TODA abertura/login da plataforma ate a pessoa ativar. "Agora nao" so
// esconde o aviso ate ela abrir a plataforma de novo (nao fica atras dela a cada clique).

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

export default function PushSetup({ user }: { user: any }) {
  const [mode, setMode] = useState<'hidden' | 'ask' | 'ios' | 'blocked' | 'done'>('hidden')
  const [busy, setBusy] = useState(false)
  const dismissKey = 'mcpia_push_dismissed_' + (user?.id || 'anon')

  async function saveSubscription(reg: ServiceWorkerRegistration) {
    const supabase = createClient()
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
      })
    }
    const json: any = sub.toJSON()
    if (!json || !json.endpoint || !json.keys) return false
    await supabase.rpc('save_push_subscription', {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_platform: detectPlatform(),
      p_user_agent: navigator.userAgent || '',
    })
    return true
  }

  useEffect(function() {
    let timer: any = null
    async function init() {
      try {
        if (!('serviceWorker' in navigator)) return
        const reg = await navigator.serviceWorker.register('/sw.js')

        const platform = detectPlatform()
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
        const hasPush = 'PushManager' in window && 'Notification' in window

        let dismissedRecently = false
        try { dismissedRecently = sessionStorage.getItem(dismissKey) === '1' } catch (e) {}

        // iPhone fora do app instalado: so funciona depois de adicionar a tela inicial
        if (!hasPush) {
          if (platform === 'ios' && !standalone && !dismissedRecently) {
            timer = setTimeout(function() { setMode('ios') }, 4000)
          }
          return
        }

        if (Notification.permission === 'granted') {
          // Ja aceitou: garante que o aparelho esta salvo (uma vez por abertura)
          let already = false
          try { already = sessionStorage.getItem('mcpia_push_saved') === '1' } catch (e) {}
          if (!already) {
            await navigator.serviceWorker.ready
            const ok = await saveSubscription(reg)
            if (ok) { try { sessionStorage.setItem('mcpia_push_saved', '1') } catch (e) {} }
          }
          return
        }

        if (Notification.permission === 'default' && !dismissedRecently) {
          timer = setTimeout(function() { setMode('ask') }, 4000)
        }
        // Bloqueou antes: o navegador nao deixa pedir de novo, entao mostramos como desbloquear
        if (Notification.permission === 'denied' && !dismissedRecently) {
          timer = setTimeout(function() { setMode('blocked') }, 4000)
        }
      } catch (e) {}
    }
    init()
    return function() { if (timer) clearTimeout(timer) }
  }, [])

  function dismiss() {
    setMode('hidden')
    try { sessionStorage.setItem(dismissKey, '1') } catch (e) {}
  }

  async function enable() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        const reg = await navigator.serviceWorker.ready
        const ok = await saveSubscription(reg)
        setMode(ok ? 'done' : 'hidden')
        if (ok) setTimeout(function() { setMode('hidden') }, 4000)
      } else {
        dismiss()
      }
    } catch (e) {
      setMode('hidden')
    }
    setBusy(false)
  }

  if (mode === 'hidden') return null

  return (
    <div style={{ position: 'fixed', left: 16, right: 16, bottom: 150, zIndex: 900, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 18px 50px rgba(0,0,0,0.25)', padding: 16, display: 'flex', gap: 12, animation: 'pushIn 0.4s ease' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="ti ti-bell-ringing" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {mode === 'done' ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', paddingTop: 10 }}>Pronto! Você vai receber as novidades 🎉</div>
          ) : mode === 'ios' ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Receba as novidades no iPhone</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 10 }}>
                Toque em <b>Compartilhar</b> (o quadradinho com a seta) e depois em <b>Adicionar à Tela de Início</b>. Depois abra a plataforma pelo ícone e ative as notificações e <b>ganhe 10 pontos no ranking</b>.
              </div>
              <button onClick={function() { dismiss(); try { window.dispatchEvent(new Event('mcpia-como-instalar')) } catch (e) {} }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: '#fff', fontWeight: 700, fontSize: 13, marginRight: 8 }}>Ver como instalar</button>
              <button onClick={dismiss} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>Entendi</button>
            </>
          ) : mode === 'blocked' ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Ative as notificações</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 10 }}>
                As notificações estão bloqueadas neste aparelho. Toque no <b>cadeado</b> ao lado do endereço do site, escolha <b>Notificações</b> e mude para <b>Permitir</b>. Depois atualize a página.
              </div>
              <button onClick={dismiss} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>Entendi</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Quer receber as novidades?</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 10 }}>
                Avisamos aqui no seu aparelho quando liberarmos novas plataformas, produtos e aulas. <b>Ative e ganhe 10 pontos no ranking!</b>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={enable} disabled={busy} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5b4ef8, #ec4899)', color: '#fff', fontWeight: 700, fontSize: 13, opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Ativando...' : 'Ativar e ganhar 10 pontos'}
                </button>
                <button onClick={dismiss} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--muted2)', fontSize: 13 }}>Agora não</button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{'@keyframes pushIn { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }'}</style>
    </div>
  )
}
