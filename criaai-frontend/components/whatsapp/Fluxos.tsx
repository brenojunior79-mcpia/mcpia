'use client'
import { useEffect, useState } from 'react'
import { DIAS, normalizar, type Horario as H } from '@/lib/waHours'
import Horario from './Horario'

const CURTO: Record<string, string> = { mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom' }

// "Seg a Sex · 09:00–18:00"
function resumo(h: H): string {
  const on = DIAS.filter(function(d) { return h.days[d.k].on })
  if (on.length === 0) return 'Nenhum dia de atendimento marcado'
  const grupos: Record<string, string[]> = {}
  for (const d of on) { const x = h.days[d.k]; const k = x.start + '–' + x.end; (grupos[k] = grupos[k] || []).push(d.k) }
  return Object.keys(grupos).map(function(k) {
    const ks = grupos[k]
    const idx = ks.map(function(x) { return DIAS.findIndex(function(d) { return d.k === x }) })
    const seq = idx.every(function(v, i) { return i === 0 || v === idx[i - 1] + 1 })
    const dias = ks.length >= 3 && seq ? CURTO[ks[0]] + ' a ' + CURTO[ks[ks.length - 1]] : ks.map(function(x) { return CURTO[x] }).join(', ')
    return dias + ' · ' + k
  }).join(' | ')
}

// Lista de fluxos de automacao do WhatsApp. Cada fluxo abre a propria tela de configuracao.
export default function Fluxos() {
  const [tela, setTela] = useState<'lista' | 'horario'>('lista')
  const [h, setH] = useState<H | null>(null)

  useEffect(function() {
    if (tela !== 'lista') return
    fetch('/api/whatsapp/settings', { cache: 'no-store' }).then(function(r) { return r.json() }).then(function(j) { if (j.settings) setH(normalizar(j.settings)) }).catch(function() {})
  }, [tela])

  if (tela === 'horario') {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px 0', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <button onClick={function() { setTela('lista') }} style={{ cursor: 'pointer', border: 0, background: 'transparent', color: 'var(--accent)', fontWeight: 800, fontSize: 13.5, padding: 0 }}>← Voltar para fluxos</button>
        </div>
        <Horario />
      </div>
    )
  }

  const ativo = !!h && h.away_enabled
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>⚡ Fluxos</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', lineHeight: 1.5, marginBottom: 14 }}>
          Automações do WhatsApp: respostas que a plataforma envia sozinha. Clique em um fluxo para ver e editar.
        </div>

        <div onClick={function() { setTela('horario') }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🕒</div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Horário de atendimento</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 2 }}>Responde sozinho quando alguém escreve fora do horário.</div>
            {h && <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 4, fontWeight: 600 }}>{resumo(h)}</div>}
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, borderRadius: 999, padding: '4px 10px', background: !h ? 'var(--surface2)' : ativo ? 'rgba(22,163,74,0.14)' : 'var(--surface2)', color: !h ? 'var(--muted2)' : ativo ? '#15803d' : 'var(--muted2)' }}>{!h ? '…' : ativo ? '● Ativo' : '○ Desligado'}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13.5 }}>Editar ›</span>
        </div>
      </div>
    </div>
  )
}
