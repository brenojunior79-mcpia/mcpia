'use client'
import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosSheet, setShowIosSheet] = useState(false)

  useEffect(function() {
    try {
      const dismissed = localStorage.getItem('mcpia_install_dismissed')
      if (dismissed === 'true') return

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
      if (isStandalone) return

      const ua = window.navigator.userAgent || ''
      const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream

      if (iosDevice) {
        setIsIos(true)
        setShowBanner(true)
        return
      }

      const handleBeforeInstall = function(e: any) {
        e.preventDefault()
        setDeferredPrompt(e)
        setShowBanner(true)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstall)
      return function() { window.removeEventListener('beforeinstallprompt', handleBeforeInstall) }
    } catch (e) {}
  }, [])

  function dismiss() {
    setShowBanner(false)
    try { localStorage.setItem('mcpia_install_dismissed', 'true') } catch (e) {}
  }

  async function handleInstallClick() {
    if (isIos) {
      setShowIosSheet(true)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <>
      <div style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12, maxWidth: 480, margin: '0 auto',
      }}>
        <img src="/icon-192.png" alt="" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Adicionar app à tela de início</div>
          <div style={{ fontSize: 11, color: 'var(--muted2)' }}>Acesse mais rápido, como um app</div>
        </div>
        <button
          onClick={handleInstallClick}
          style={{
            background: 'linear-gradient(135deg,#5b4ef8,#9b8ffc)', color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Adicionar
        </button>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', padding: 4, flexShrink: 0 }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {showIosSheet && (
        <div
          onClick={function() { setShowIosSheet(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={function(e) { e.stopPropagation() }}
            style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 480, margin: '0 auto' }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Como instalar no iPhone</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-glow)', color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>1</span>
              <span style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                Toque no ícone de compartilhar <i className="ti ti-square-arrow-up" style={{ fontSize: 18 }} /> na barra do navegador
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-glow)', color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>2</span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>Role para baixo e toque em "Adicionar à Tela de Início"</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-glow)', color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>3</span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>Toque em "Adicionar" no canto superior direito</span>
            </div>
            <button
              onClick={function() { setShowIosSheet(false); dismiss() }}
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
