'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import styles from '../admin.module.css'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const PREMIOS = [200, 150, 100]
const COLUNAS: { k: string; t: string }[] = [
  { k: 'p_acesso', t: 'Acesso' }, { k: 'p_aulas', t: 'Aulas' }, { k: 'p_ebooks', t: 'Ebooks' }, { k: 'p_sites', t: 'Sites' },
  { k: 'p_criativos', t: 'Criativos' }, { k: 'p_app', t: 'App' }, { k: 'p_notif', t: 'Notif.' },
]

function plural(n: number, um: string, varios: string) { return n + ' ' + (n === 1 ? um : varios) }

// Frase curta do que o aluno fez no periodo
function oQueFez(l: any) {
  const p: string[] = []
  if (l.n_aulas > 0) p.push('Assistiu ' + plural(l.n_aulas, 'aula', 'aulas'))
  if (l.n_ebooks > 0) p.push('Gerou ' + plural(l.n_ebooks, 'ebook', 'ebooks'))
  if (l.n_sites > 0) p.push('Criou ' + plural(l.n_sites, 'site', 'sites'))
  if (l.n_criativos > 0) p.push('Gerou ' + plural(l.n_criativos, 'criativo', 'criativos'))
  if (l.p_app > 0) p.push('Instalou o app')
  if (l.p_notif > 0) p.push('Ativou as notificações')
  if (l.n_dias > 0) p.push('Entrou ' + plural(l.n_dias, 'dia', 'dias'))
  return p.join(' · ')
}

function fmtDesde(iso: string) {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) } catch (e) { return '' }
}

export default function AdminRankingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [dados, setDados] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState('')
  const [periodo, setPeriodo] = useState<'recente' | 'ciclo'>('recente')
  const [visiveis, setVisiveis] = useState(50)

  async function carregar(per?: 'recente' | 'ciclo') {
    const r = await fetch('/api/admin/ranking?periodo=' + (per || periodo), { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) { setErro(j.error || 'Erro ao carregar'); return }
    setErro(''); setDados(j)
  }

  useEffect(function() {
    async function init() {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { router.push('/login'); return }
      const p = await supabase.from('profiles').select('is_admin').eq('id', u.data.user.id).single()
      if (!p.data?.is_admin) { router.push('/dashboard'); return }
      setOk(true)
      carregar()
    }
    init()
  }, [])

  async function acao(userId: string, a: 'excluir' | 'voltar') {
    let motivo = ''
    if (a === 'excluir') {
      const m = window.prompt('Por que tirar este aluno do ranking? (fica anotado)')
      if (m === null) return
      motivo = m
    }
    setBusy(userId)
    await fetch('/api/admin/ranking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, acao: a, motivo }) })
    setBusy('')
    carregar()
  }

  if (!ok) return null
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.title}>Conferência do ranking</div>
          <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{dados ? 'Ranking de ' + dados.mes + ' (até ' + dados.fimEm + ') · ' + dados.total + ' alunos com pontos desde ' + fmtDesde(dados.desde) : 'Carregando...'}</div>
        </div>
      </div>
      <div style={{ padding: '0 24px 40px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 14, maxWidth: 760, lineHeight: 1.6 }}>
          Confira de onde vieram os pontos de cada aluno antes de fazer o Pix. Se algo estiver estranho, use <b>Tirar do ranking</b>. O aluno sai da disputa e deixa de aparecer para os outros. Os prêmios (R$200, R$150 e R$100) valem para o <b>Ranking inteiro</b>. A aba <b>Ontem e hoje</b> mostra só quem pontuou nesses 2 dias e o que cada um fez.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {([['recente', 'Ontem e hoje'], ['ciclo', 'Ranking inteiro']] as const).map(function(o) {
            const on = periodo === o[0]
            return <button key={o[0]} onClick={function() { setPeriodo(o[0]); setVisiveis(50); setDados(null); carregar(o[0]) }} style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: 99, fontWeight: 800, fontSize: 13, border: on ? '2px solid #7c5cfc' : '1px solid var(--border)', background: on ? 'rgba(124,92,252,0.12)' : 'var(--surface)', color: 'var(--text)' }}>{o[1]}</button>
          })}
        </div>
        {erro && <div style={{ color: '#dc2626', fontWeight: 700 }}>{erro}</div>}
        {dados && (
          <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted2)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '10px 12px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Aluno</th>
                  {COLUNAS.map(function(c) { return <th key={c.k} style={{ padding: '10px 8px', textAlign: 'center' }}>{c.t}</th> })}
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '10px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.slice(0, visiveis).map(function(l: any) {
                  const premio = dados.periodo === 'ciclo' && l.posicao && l.posicao <= 3 ? PREMIOS[l.posicao - 1] : 0
                  return (
                    <tr key={l.user_id} style={{ borderTop: '1px solid var(--border)', opacity: l.excluido ? 0.5 : 1, background: premio ? 'rgba(245,179,1,0.07)' : undefined }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800 }}>{l.excluido ? '—' : (l.posicao <= 3 ? ['🥇', '🥈', '🥉'][l.posicao - 1] : l.posicao + 'º')}</td>
                      <td style={{ padding: '10px 12px', minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {l.avatar_url ? <img src={l.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : String(l.nome || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{l.nome || 'Sem nome'}{premio ? ' · R$ ' + premio : ''}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 2 }}>{oQueFez(l)}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted2)' }}>{l.email}{l.whatsapp ? ' · ' + l.whatsapp : ''}</div>
                          </div>
                        </div>
                      </td>
                      {COLUNAS.map(function(c) { return <td key={c.k} style={{ padding: '10px 8px', textAlign: 'center', color: l[c.k] ? 'var(--text)' : 'var(--muted2)' }}>{l[c.k]}</td> })}
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, fontSize: 15 }}>{l.pontos}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {l.excluido
                          ? <button disabled={busy === l.user_id} onClick={function() { acao(l.user_id, 'voltar') }} style={{ cursor: 'pointer', border: '1px solid #16a34a', color: '#15803d', background: 'transparent', borderRadius: 8, padding: '5px 10px', fontWeight: 700, fontSize: 12 }}>Voltar ao ranking</button>
                          : <button disabled={busy === l.user_id} onClick={function() { acao(l.user_id, 'excluir') }} style={{ cursor: 'pointer', border: '1px solid #dc2626', color: '#dc2626', background: 'transparent', borderRadius: 8, padding: '5px 10px', fontWeight: 700, fontSize: 12 }}>Tirar do ranking</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {dados.linhas.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted2)' }}>Ninguém pontuou neste período ainda.</div>}
            {dados.linhas.length > visiveis && (
              <div style={{ padding: 14, textAlign: 'center' }}>
                <button onClick={function() { setVisiveis(visiveis + 50) }} style={{ cursor: 'pointer', padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', fontWeight: 700 }}>Ver mais ({dados.linhas.length - visiveis})</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
