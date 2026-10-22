'use client'
import { useState } from 'react'
import styles from '../dashboard.module.css'
import CardRoteiro, { Roteiro, ROTEIRO_VAZIO, roteiroEmTexto } from '@/components/criativo/CardRoteiro'
import CardNarracao, { Narracao } from '@/components/criativo/CardNarracao'

type Aba = 'roteiro' | 'narracao' | 'videos' | 'edicao'

export default function CriativoPage() {
  const [aba, setAba] = useState<Aba>('roteiro')
  const [roteiro, setRoteiro] = useState<Roteiro>(ROTEIRO_VAZIO)
  const [textoNarracao, setTextoNarracao] = useState('')
  const [narracao, setNarracao] = useState<Narracao | null>(null)

  const cards: { id: Aba; n: number; icone: string; titulo: string; sub: string; pronto: boolean }[] = [
    { id: 'roteiro', n: 1, icone: '✍️', titulo: 'Roteiro', sub: 'Gancho, corpo, mecanismo e CTA', pronto: !!roteiroEmTexto(roteiro) },
    { id: 'narracao', n: 2, icone: '🎙️', titulo: 'Narração', sub: 'Texto vira áudio com a voz que você escolher', pronto: !!narracao },
    { id: 'videos', n: 3, icone: '🎞️', titulo: 'Vídeos', sub: 'Busque e baixe vídeos para o criativo', pronto: false },
    { id: 'edicao', n: 4, icone: '✂️', titulo: 'Edição', sub: 'Junta vídeo, narração, música e legenda', pronto: false },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.pageTitle}>Gerador de Criativos</div>
          <div className={styles.pageSub}>Do roteiro ao vídeo pronto, em 4 passos</div>
        </div>
      </div>

      <div className={styles.content}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {cards.map(function(c) {
            const on = aba === c.id
            return (
              <button key={c.id} onClick={function() { setAba(c.id) }} style={{ cursor: 'pointer', textAlign: 'left', padding: '14px 16px', borderRadius: 16, color: 'var(--text)', background: on ? 'rgba(124,92,252,0.10)' : 'var(--surface)', border: on ? '2px solid #7c5cfc' : '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{c.icone}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, flex: 1 }}>{c.n}. {c.titulo}</span>
                  {c.pronto && <span style={{ color: '#15803d', fontWeight: 800, fontSize: 13 }}>✓ pronto</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 4 }}>{c.sub}</div>
              </button>
            )
          })}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, maxWidth: 860, boxShadow: 'var(--shadow-sm)' }}>
          {aba === 'roteiro' && (
            <CardRoteiro roteiro={roteiro} setRoteiro={setRoteiro} onUsar={function() { setTextoNarracao(roteiroEmTexto(roteiro)); setAba('narracao') }} />
          )}
          {aba === 'narracao' && (
            <CardNarracao texto={textoNarracao} setTexto={setTextoNarracao} narracao={narracao} setNarracao={setNarracao} />
          )}
          {aba === 'videos' && <div style={{ color: 'var(--muted2)', fontSize: 14 }}>Em construção.</div>}
          {aba === 'edicao' && <div style={{ color: 'var(--muted2)', fontSize: 14 }}>Em construção.</div>}
        </div>
      </div>
    </div>
  )
}
