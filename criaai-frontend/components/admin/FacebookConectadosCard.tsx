'use client'
import { useEffect, useState } from 'react'

function fmt(iso: string): string {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' }
}

// Card do admin: alunos que conectaram a conta do Facebook
export default function FacebookConectadosCard() {
  const [dados, setDados] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [visiveis, setVisiveis] = useState(5)

  useEffect(function() {
    let alive = true
    async function carregar() {
      try {
        const r = await fetch('/api/admin/facebook-conectados', { cache: 'no-store' })
        const j = await r.json()
        if (!alive) return
        if (!r.ok) { setErro(j.error || 'Erro ao carregar'); return }
        setErro(''); setDados(j)
      } catch (e) { if (alive) setErro('Erro ao carregar') }
    }
    carregar()
    const t = setInterval(carregar, 60000)
    return function() { alive = false; clearInterval(t) }
  }, [])

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 28 }
  const titulo = (
    <div style={{ fontSize: 13, color: 'var(--muted2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <i className="ti ti-brand-facebook" style={{ fontSize: 16, color: '#1877f2' }} /> Alunos com Facebook conectado
    </div>
  )

  if (erro) return <div style={card}>{titulo}<div style={{ fontSize: 13, color: 'var(--muted2)' }}>{erro}</div></div>
  if (!dados) return <div style={card}>{titulo}<div style={{ fontSize: 13, color: 'var(--muted2)' }}>Carregando...</div></div>

  const q = busca.trim().toLowerCase()
  const lista: any[] = (dados.lista || []).filter(function(x: any) {
    if (!q) return true
    return (x.nome + ' ' + x.email + ' ' + x.conta_nome + ' ' + x.fb_nome).toLowerCase().indexOf(q) >= 0
  })

  const box: React.CSSProperties = { flex: 1, minWidth: 110, background: 'var(--surface2, rgba(255,255,255,.04))', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }

  return (
    <div style={card}>
      {titulo}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={box}><div style={{ fontSize: 24, fontWeight: 800 }}>{dados.total}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>conectaram</div></div>
        <div style={box}><div style={{ fontSize: 24, fontWeight: 800 }}>{dados.com_conta}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>com conta de anúncios</div></div>
        <div style={box}><div style={{ fontSize: 24, fontWeight: 800, color: dados.expirados ? '#f59e0b' : undefined }}>{dados.expirados}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>precisam reconectar</div></div>
      </div>

      {dados.total > 5 && (
        <input
          value={busca}
          onChange={function(e) { setBusca(e.target.value); setVisiveis(5) }}
          placeholder="Buscar por nome, e-mail ou conta"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 13, marginBottom: 12 }}
        />
      )}

      {lista.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{dados.total === 0 ? 'Nenhum aluno conectou o Facebook ainda.' : 'Nenhum resultado.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.slice(0, visiveis).map(function(x: any) {
            return (
              <div key={x.user_id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{x.nome || x.fb_nome || 'Sem nome'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>{x.email || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>
                    {x.conta_nome ? x.conta_nome + (x.contas > 1 ? ' (+' + (x.contas - 1) + ' conta' + (x.contas > 2 ? 's' : '') + ')' : '') : 'Sem conta de anúncios'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>
                  <div>Conectou: {fmt(x.conectou_em)}</div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: x.plano_ativo ? 'rgba(34,197,94,.15)' : 'rgba(148,163,184,.15)', color: x.plano_ativo ? '#22c55e' : 'var(--muted2)', fontWeight: 700 }}>{x.plano_ativo ? 'Plano ativo' : 'Sem plano'}</span>
                    {x.expirado && <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,.15)', color: '#f59e0b', fontWeight: 700 }}>Reconectar</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lista.length > visiveis && (
        <button onClick={function() { setVisiveis(visiveis + 10) }} style={{ marginTop: 12, background: 'transparent', border: '1px solid var(--border)', color: 'inherit', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          Ver mais ({lista.length - visiveis})
        </button>
      )}
    </div>
  )
}
