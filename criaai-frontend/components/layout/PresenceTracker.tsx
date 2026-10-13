'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// Avisa a plataforma que o aluno esta online: 1 vez por minuto, so enquanto a tela esta aberta e visivel.
// Nao mostra nada na tela. Qualquer erro e ignorado, para nunca atrapalhar o aluno.
const PING_EVERY_MS = 60 * 1000

export default function PresenceTracker() {
  const pathname = usePathname()
  const pathRef = useRef('')
  pathRef.current = pathname || ''

  // Ao trocar de pagina, atualiza na hora
  useEffect(function() {
    ping()
  }, [pathname])

  useEffect(function() {
    const timer = setInterval(function() {
      if (document.visibilityState === 'visible') ping()
    }, PING_EVERY_MS)
    function onVisible() { if (document.visibilityState === 'visible') ping() }
    document.addEventListener('visibilitychange', onVisible)
    return function() {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function ping() {
    try {
      if (document.visibilityState !== 'visible') return
      const supabase = createClient()
      supabase.rpc('presence_ping', { p_page: pathRef.current }).then(function() {}, function() {})
    } catch (e) {}
  }

  return null
}
