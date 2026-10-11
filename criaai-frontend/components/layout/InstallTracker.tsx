'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

// Registra quando o aluno instala o app (PWA) ou abre a plataforma pelo icone do app.
// Nao mostra nada na tela. Qualquer erro e ignorado, para nunca atrapalhar o aluno.
function detectPlatform(): string {
  try {
    const ua = navigator.userAgent || ''
    if (/android/i.test(ua)) return 'android'
    if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1)) return 'ios'
    return 'computador'
  } catch (e) { return 'outro' }
}

export default function InstallTracker() {
  useEffect(function() {
    const supabase = createClient()
    const platform = detectPlatform()

    async function register(source: string) {
      try {
        await supabase.rpc('register_app_open', { p_platform: platform, p_source: source })
      } catch (e) {}
    }

    let standalone = false
    try {
      standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    } catch (e) {}

    // Uma vez por abertura do app (nao a cada pagina)
    if (standalone) {
      let already = false
      try { already = sessionStorage.getItem('mcpia_app_open_logged') === '1' } catch (e) {}
      if (!already) {
        try { sessionStorage.setItem('mcpia_app_open_logged', '1') } catch (e) {}
        register('standalone')
      }
    }

    function onInstalled() { register('appinstalled') }
    window.addEventListener('appinstalled', onInstalled)
    return function() { window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  return null
}
