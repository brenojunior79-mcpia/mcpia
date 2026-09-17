'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SuportePage() {
  const WHATSAPP = '553791348869'
  const [isOpen, setIsOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(function() {
    function check() {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay() // 0=dom, 6=sab
      const weekday = day >= 1 && day <= 5
      const inHours = hour >= 9 && hour < 18
      setIsOpen(weekday && inHours)
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }
    check()
    const interval = setInterval(check, 60000)
    return function() { clearInterval(interval) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #16a34a, #4ade80)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎧</div>
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, margin: 0 }}>Suporte Humano</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOpen ? '#16a34a' : '#ef4444', animation: isOpen ? 'pulse 2s ease infinite' : 'none' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#16a34a' : '#ef4444' }}>
                  {isOpen ? 'Online agora' : 'Fora do horário'} · {currentTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status de horario */}
        <div style={{
          background: isOpen ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
          border: '1px solid ' + (isOpen ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.25)'),
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{isOpen ? '✅' : '⏰'}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: isOpen ? '#16a34a' : '#ef4444' }}>
              {isOpen ? 'Equipe disponível agora!' : 'Fora do horário de atendimento'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted2)', margin: 0, lineHeight: 1.6 }}>
            Atendimento humano disponível de <strong>segunda a sexta</strong>, das <strong>9h às 18h</strong>.
            {!isOpen && (
              <span> Fora desse horário, use o <Link href="/dashboard/chat" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Assistente IA</Link> — disponível 24h!</span>
            )}
          </p>
        </div>

        {/* Fora do horario - CTA para IA */}
        {!isOpen && (
          <Link href="/dashboard/chat" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'linear-gradient(135deg, rgba(91,78,248,0.1), rgba(91,78,248,0.04))',
            border: '1px solid rgba(91,78,248,0.2)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            textDecoration: 'none',
          }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent2)', marginBottom: 2 }}>Assistente IA disponível agora!</div>
              <p style={{ fontSize: 12, color: 'var(--muted2)', margin: 0 }}>Tire suas dúvidas com nossa IA treinada. Resposta imediata, 24 horas por dia.</p>
            </div>
            <i className="ti ti-arrow-right" style={{ fontSize: 18, color: 'var(--accent2)', flexShrink: 0, marginLeft: 'auto' }} />
          </Link>
        )}

        {/* Tipos de suporte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { icon: '⚡', label: 'Resposta rápida', desc: 'Atendimento em até 2 horas no horário comercial' },
            { icon: '🛠️', label: 'Suporte técnico', desc: 'Problemas com a plataforma e funcionalidades' },
            { icon: '💡', label: 'Dúvidas gerais', desc: 'Como usar os recursos e tirar o máximo da IA' },
            { icon: '💳', label: 'Financeiro', desc: 'Planos, créditos, pagamentos e reembolsos' },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{item.desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Botao WhatsApp */}
        <a
          href={'https://wa.me/' + WHATSAPP + '?text=Ola, preciso de suporte na Plataforma do Cristao Prospero'}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#16a34a',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            padding: '14px 32px',
            borderRadius: 14,
            textDecoration: 'none',
            boxShadow: '0 8px 20px rgba(22,163,74,0.35)',
            transition: 'all 0.2s',
            width: '100%',
            boxSizing: 'border-box' as const,
          }}
        >
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 22 }} />
          Falar com suporte no WhatsApp
        </a>
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>
          Segunda a Sexta · 9h às 18h · Fora do horário? Use o <Link href="/dashboard/chat" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Assistente IA</Link>
        </p>

        <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.4)} 50%{box-shadow:0 0 0 6px rgba(22,163,74,0)} }`}</style>
      </div>
    </div>
  )
}
