'use client'
import { GUIA_FUNIL } from '@/lib/anuncios'
import { cartao, titulo } from './estilo'

export default function GuiaFunil() {
  return (
    <div style={cartao}>
      <h2 style={titulo}>📘 Guia do funil</h2>
      <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2, marginBottom: 14 }}>Entenda cada etapa. Quem vende bem sabe em qual delas está o problema.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {GUIA_FUNIL.map(function(g) {
          return (
            <div key={g.nome} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{g.icone} {g.nome}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{g.oQue}</div>
              <div style={{ fontSize: 12.5, marginTop: 8 }}><b>O que mede:</b> <span style={{ color: 'var(--muted2)' }}>{g.mede}</span></div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}><b>Como melhorar:</b> <span style={{ color: 'var(--muted2)' }}>{g.melhorar}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
