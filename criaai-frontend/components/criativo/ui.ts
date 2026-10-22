import type React from 'react'

export const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
}
export const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }
export const dica: React.CSSProperties = { fontWeight: 500, color: 'var(--muted2)', fontSize: 12 }
export const botao: React.CSSProperties = {
  cursor: 'pointer', border: 0, background: '#7c5cfc', color: '#fff', fontWeight: 800, fontSize: 14,
  padding: '11px 18px', borderRadius: 10,
}
export const botaoClaro: React.CSSProperties = {
  cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)',
  fontWeight: 700, fontSize: 13, padding: '9px 14px', borderRadius: 10,
}
export const erro: React.CSSProperties = { marginTop: 10, fontSize: 13, fontWeight: 700, color: '#b91c1c' }
